import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { BudgetPeriod } from '@prisma/client';
import { DEFAULT_USER_ID, startOfUtcDay } from '../../common';
import { PrismaService } from '../../prisma/prisma.service';
import {
  CreateBudgetLimitDto,
  CreateBudgetPeriodDto,
  CreateCurrentBudgetDto,
  UpdateBudgetLimitDto,
  UpdateCurrentBudgetDto,
} from './budgets.dto';

@Injectable()
export class BudgetsService {
  constructor(private readonly prisma: PrismaService) {}

  async getCurrent() {
    const today = startOfUtcDay();
    const period = await this.prisma.budgetPeriod.findFirst({
      where: {
        userId: DEFAULT_USER_ID,
        OR: [
          { status: 'active' },
          { startDate: { lte: today }, endDate: { gte: today } },
        ],
      },
      orderBy: [{ status: 'asc' }, { startDate: 'desc' }],
    });
    if (!period) return { current: null, limits: [], summary: null };
    return this.withUsage(period);
  }

  async createCurrent(dto: CreateCurrentBudgetDto) {
    await this.validateCurrent(dto);
    await this.prisma.$transaction(async (tx) => {
      const current = await tx.budgetPeriod.findFirst({
        where: { userId: DEFAULT_USER_ID, status: 'active' },
        orderBy: { createdAt: 'desc' },
      });
      const period = current
        ? await tx.budgetPeriod.update({
            where: { id: current.id, userId: DEFAULT_USER_ID },
            data: {
              name: dto.name,
              periodType: dto.periodType,
              startDate: new Date(dto.startDate),
              endDate: new Date(dto.endDate),
            },
          })
        : await tx.budgetPeriod.create({
            data: {
              userId: DEFAULT_USER_ID,
              name: dto.name,
              periodType: dto.periodType,
              startDate: new Date(dto.startDate),
              endDate: new Date(dto.endDate),
              status: 'active',
            },
          });
      await tx.budgetPeriod.updateMany({
        where: {
          userId: DEFAULT_USER_ID,
          status: 'active',
          NOT: { id: period.id },
        },
        data: { status: 'closed' },
      });
      await tx.budgetLimit.deleteMany({
        where: { userId: DEFAULT_USER_ID, budgetPeriodId: period.id },
      });
      if (dto.limits.length)
        await tx.budgetLimit.createMany({
          data: dto.limits.map((limit) => ({
            userId: DEFAULT_USER_ID,
            budgetPeriodId: period.id,
            categoryId: limit.categoryId,
            limitAmount: limit.amount,
          })),
        });
    });
    return this.getCurrent();
  }

  async updateCurrent(dto: UpdateCurrentBudgetDto) {
    const current = await this.prisma.budgetPeriod.findFirst({
      where: { userId: DEFAULT_USER_ID, status: 'active' },
      include: { limits: true },
      orderBy: { createdAt: 'desc' },
    });
    if (!current) throw new NotFoundException('Current budget not found');
    return this.createCurrent({
      name: dto.name ?? current.name,
      periodType: dto.periodType ?? current.periodType,
      startDate: dto.startDate ?? current.startDate.toISOString(),
      endDate: dto.endDate ?? current.endDate.toISOString(),
      limits:
        dto.limits ??
        current.limits.map((limit) => ({
          categoryId: limit.categoryId,
          amount: Number(limit.limitAmount),
        })),
    });
  }

  getPeriods() {
    return this.prisma.budgetPeriod.findMany({
      where: { userId: DEFAULT_USER_ID },
      orderBy: { startDate: 'desc' },
    });
  }

  async getPeriod(id: string) {
    const period = await this.prisma.budgetPeriod.findFirst({
      where: { id, userId: DEFAULT_USER_ID },
    });
    if (!period) throw new NotFoundException('Budget period not found');
    return this.withUsage(period);
  }

  createPeriod(dto: CreateBudgetPeriodDto) {
    const startDate = new Date(dto.startDate);
    const endDate = new Date(dto.endDate);
    if (startDate > endDate)
      throw new BadRequestException(
        'startDate must be before or equal to endDate',
      );
    return this.prisma.budgetPeriod.create({
      data: { ...dto, startDate, endDate, userId: DEFAULT_USER_ID },
    });
  }

  async createLimit(dto: CreateBudgetLimitDto) {
    await this.requirePeriod(dto.budgetPeriodId);
    await this.requireCategory(dto.categoryId);
    const exists = await this.prisma.budgetLimit.findFirst({
      where: {
        userId: DEFAULT_USER_ID,
        budgetPeriodId: dto.budgetPeriodId,
        categoryId: dto.categoryId,
      },
    });
    if (exists)
      throw new ConflictException(
        'Budget limit already exists for this category',
      );
    return this.prisma.budgetLimit.create({
      data: { ...dto, userId: DEFAULT_USER_ID },
      include: { category: true },
    });
  }

  async updateLimit(id: string, dto: UpdateBudgetLimitDto) {
    const limit = await this.prisma.budgetLimit.findFirst({
      where: { id, userId: DEFAULT_USER_ID },
    });
    if (!limit) throw new NotFoundException('Budget limit not found');
    return this.prisma.budgetLimit.update({
      where: { id, userId: DEFAULT_USER_ID },
      data: dto,
      include: { category: true },
    });
  }

  private async withUsage(period: BudgetPeriod) {
    const [limits, usage] = await Promise.all([
      this.prisma.budgetLimit.findMany({
        where: { userId: DEFAULT_USER_ID, budgetPeriodId: period.id },
        include: { category: true },
      }),
      this.prisma.expense.groupBy({
        by: ['categoryId'],
        where: {
          userId: DEFAULT_USER_ID,
          expenseDate: { gte: period.startDate, lte: period.endDate },
        },
        _sum: { amount: true },
      }),
    ]);
    const used = new Map(
      usage.map((item) => [item.categoryId, item._sum.amount ?? 0]),
    );
    const calculated = limits.map((limit) => {
      const amount = Number(limit.limitAmount);
      const usedAmount = Number(used.get(limit.categoryId) ?? 0);
      return {
        ...limit,
        categoryName: limit.category.name,
        amount,
        used: usedAmount,
        usedAmount,
        remaining: amount - usedAmount,
        status:
          usedAmount > amount
            ? 'exceeded'
            : usedAmount >= amount * 0.8
              ? 'warning'
              : 'ok',
      };
    });
    const totalLimit = calculated.reduce((sum, item) => sum + item.amount, 0);
    const totalUsed = calculated.reduce((sum, item) => sum + item.used, 0);
    return {
      ...period,
      current: { ...period, isActive: period.status === 'active' },
      limits: calculated,
      summary: {
        totalLimit,
        totalUsed,
        totalRemaining: totalLimit - totalUsed,
      },
    };
  }

  private async validateCurrent(dto: CreateCurrentBudgetDto) {
    if (new Date(dto.startDate) > new Date(dto.endDate))
      throw new BadRequestException(
        'startDate must be before or equal to endDate',
      );
    const categoryIds = [...new Set(dto.limits.map((item) => item.categoryId))];
    if (categoryIds.length !== dto.limits.length)
      throw new BadRequestException('Budget categories must be unique');
    const categories = await this.prisma.expenseCategory.count({
      where: {
        userId: DEFAULT_USER_ID,
        id: { in: categoryIds },
        isActive: true,
      },
    });
    if (categories !== categoryIds.length)
      throw new NotFoundException('Expense category not found');
  }

  private async requirePeriod(id: string) {
    if (
      !(await this.prisma.budgetPeriod.findFirst({
        where: { id, userId: DEFAULT_USER_ID },
      }))
    )
      throw new NotFoundException('Budget period not found');
  }

  private async requireCategory(id: string) {
    if (
      !(await this.prisma.expenseCategory.findFirst({
        where: { id, userId: DEFAULT_USER_ID },
      }))
    )
      throw new NotFoundException('Expense category not found');
  }
}
