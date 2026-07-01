import { Injectable, NotFoundException } from '@nestjs/common';
import { DEFAULT_USER_ID } from '../../common';
import { PrismaService } from '../../prisma/prisma.service';
import {
  CreateRecurringPaymentDto,
  RecurringPaymentFiltersDto,
  UpdateRecurringPaymentDto,
} from './recurring-payments.dto';

@Injectable()
export class RecurringPaymentsService {
  constructor(private readonly prisma: PrismaService) {}

  getAll(filters: RecurringPaymentFiltersDto) {
    return this.prisma.recurringObligation.findMany({
      where: {
        userId: DEFAULT_USER_ID,
        isActive: filters.includeInactive ? undefined : true,
      },
      include: { category: true },
      orderBy: [{ nextDueDate: 'asc' }, { createdAt: 'asc' }],
    });
  }

  async create(dto: CreateRecurringPaymentDto) {
    if (dto.categoryId) await this.requireCategory(dto.categoryId);
    return this.prisma.recurringObligation.create({
      data: {
        ...dto,
        nextDueDate: dto.nextDueDate ? new Date(dto.nextDueDate) : undefined,
        userId: DEFAULT_USER_ID,
      },
      include: { category: true },
    });
  }

  async update(id: string, dto: UpdateRecurringPaymentDto) {
    await this.require(id);
    if (dto.categoryId) await this.requireCategory(dto.categoryId);
    return this.prisma.recurringObligation.update({
      where: { id, userId: DEFAULT_USER_ID },
      data: {
        ...dto,
        nextDueDate: dto.nextDueDate ? new Date(dto.nextDueDate) : undefined,
      },
      include: { category: true },
    });
  }

  async remove(id: string) {
    await this.require(id);
    return this.prisma.recurringObligation.update({
      where: { id, userId: DEFAULT_USER_ID },
      data: { isActive: false },
    });
  }

  private async require(id: string) {
    const payment = await this.prisma.recurringObligation.findFirst({
      where: { id, userId: DEFAULT_USER_ID },
    });
    if (!payment) throw new NotFoundException('Recurring payment not found');
    return payment;
  }

  private async requireCategory(id: string) {
    const category = await this.prisma.expenseCategory.findFirst({
      where: { id, userId: DEFAULT_USER_ID, isActive: true },
    });
    if (!category) throw new NotFoundException('Expense category not found');
  }
}
