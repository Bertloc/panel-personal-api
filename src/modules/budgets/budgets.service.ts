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
  UpdateBudgetLimitDto,
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
    if (!period) return { current: null, limits: [] };
    return this.withUsage(period);
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
    return {
      ...period,
      limits: limits.map((limit) => ({
        ...limit,
        usedAmount: used.get(limit.categoryId) ?? 0,
      })),
    };
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
