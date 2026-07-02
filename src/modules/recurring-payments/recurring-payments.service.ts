import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import {
  CreateRecurringPaymentDto,
  RecurringPaymentFiltersDto,
  UpdateRecurringPaymentDto,
} from './recurring-payments.dto';

@Injectable()
export class RecurringPaymentsService {
  constructor(private readonly prisma: PrismaService) {}

  getAll(filters: RecurringPaymentFiltersDto, userId: string) {
    return this.prisma.recurringObligation.findMany({
      where: {
        userId,
        isActive: filters.includeInactive ? undefined : true,
      },
      include: { category: true },
      orderBy: [{ nextDueDate: 'asc' }, { createdAt: 'asc' }],
    });
  }

  async create(dto: CreateRecurringPaymentDto, userId: string) {
    if (dto.categoryId) await this.requireCategory(dto.categoryId, userId);
    return this.prisma.recurringObligation.create({
      data: {
        ...dto,
        nextDueDate: dto.nextDueDate ? new Date(dto.nextDueDate) : undefined,
        userId,
      },
      include: { category: true },
    });
  }

  async update(id: string, dto: UpdateRecurringPaymentDto, userId: string) {
    await this.require(id, userId);
    if (dto.categoryId) await this.requireCategory(dto.categoryId, userId);
    return this.prisma.recurringObligation.update({
      where: { id, userId },
      data: {
        ...dto,
        nextDueDate: dto.nextDueDate ? new Date(dto.nextDueDate) : undefined,
      },
      include: { category: true },
    });
  }

  async remove(id: string, userId: string) {
    await this.require(id, userId);
    return this.prisma.recurringObligation.update({
      where: { id, userId },
      data: { isActive: false },
    });
  }

  private async require(id: string, userId: string) {
    const payment = await this.prisma.recurringObligation.findFirst({
      where: { id, userId },
    });
    if (!payment) throw new NotFoundException('Recurring payment not found');
    return payment;
  }

  private async requireCategory(id: string, userId: string) {
    const category = await this.prisma.expenseCategory.findFirst({
      where: { id, userId, isActive: true },
    });
    if (!category) throw new NotFoundException('Expense category not found');
  }
}
