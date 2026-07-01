import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Debt, Prisma } from '@prisma/client';
import { DEFAULT_USER_ID, startOfUtcDay } from '../../common';
import { PrismaService } from '../../prisma/prisma.service';
import {
  CreateDebtDto,
  CreateDebtPaymentDto,
  DebtFiltersDto,
  UpdateDebtDto,
} from './debts.dto';

@Injectable()
export class DebtsService {
  constructor(private readonly prisma: PrismaService) {}
  async getAll(filters: DebtFiltersDto) {
    const debts = await this.prisma.debt.findMany({
      where: { userId: DEFAULT_USER_ID, status: filters.status },
      orderBy: { createdAt: 'desc' },
    });
    return debts.map((debt) => this.withCalculations(debt));
  }
  async get(id: string) {
    const debt = await this.prisma.debt.findFirst({
      where: { id, userId: DEFAULT_USER_ID },
    });
    if (!debt) throw new NotFoundException('Debt not found');
    return this.withCalculations(debt);
  }
  async create(dto: CreateDebtDto) {
    const currentAmount = dto.currentAmount ?? dto.initialAmount;
    if (currentAmount > dto.initialAmount)
      throw new BadRequestException(
        'currentAmount cannot exceed initialAmount',
      );
    const debt = await this.prisma.debt.create({
      data: {
        ...dto,
        currentAmount,
        dueDate: dto.dueDate ? new Date(dto.dueDate) : undefined,
        status: dto.status ?? 'active',
        userId: DEFAULT_USER_ID,
      },
    });
    return this.withCalculations(debt);
  }
  async update(id: string, dto: UpdateDebtDto) {
    const current = await this.require(id);
    const initialAmount = dto.initialAmount ?? Number(current.initialAmount);
    const currentAmount = dto.currentAmount ?? Number(current.currentAmount);
    if (currentAmount > initialAmount)
      throw new BadRequestException(
        'currentAmount cannot exceed initialAmount',
      );
    const debt = await this.prisma.debt.update({
      where: { id, userId: DEFAULT_USER_ID },
      data: {
        ...dto,
        dueDate: dto.dueDate ? new Date(dto.dueDate) : undefined,
      },
    });
    return this.withCalculations(debt);
  }
  async remove(id: string) {
    await this.require(id);
    const debt = await this.prisma.debt.update({
      where: { id, userId: DEFAULT_USER_ID },
      data: { status: 'cancelled' },
    });
    return this.withCalculations(debt);
  }
  async addPayment(id: string, dto: CreateDebtPaymentDto) {
    const debt = await this.get(id);
    const balance = new Prisma.Decimal(debt.currentAmount).minus(dto.amount);
    if (balance.isNegative())
      throw new BadRequestException(
        'Payment cannot exceed current debt amount',
      );
    return this.prisma.$transaction(async (tx) => {
      const payment = await tx.debtPayment.create({
        data: {
          ...dto,
          paymentDate: new Date(dto.paymentDate),
          debtId: id,
          userId: DEFAULT_USER_ID,
        },
      });
      await tx.debt.update({
        where: { id, userId: DEFAULT_USER_ID },
        data: {
          currentAmount: balance,
          status: balance.isZero() ? 'paid' : debt.status,
        },
      });
      return payment;
    });
  }
  async getPayments(id: string) {
    await this.get(id);
    return this.prisma.debtPayment.findMany({
      where: { debtId: id, userId: DEFAULT_USER_ID },
      orderBy: { paymentDate: 'desc' },
    });
  }
  async projection(id: string) {
    const debt = await this.require(id);
    const minimum = Number(debt.minimumPayment);
    if (minimum <= 0)
      throw new BadRequestException('minimumPayment must be greater than zero');
    const paymentsRemaining = Math.ceil(Number(debt.currentAmount) / minimum);
    const now = new Date();
    const firstMonth = now.getUTCDate() <= debt.paymentDay ? 0 : 1;
    const target = new Date(
      Date.UTC(
        now.getUTCFullYear(),
        now.getUTCMonth() + firstMonth + Math.max(0, paymentsRemaining - 1),
        1,
      ),
    );
    const lastDay = new Date(
      Date.UTC(target.getUTCFullYear(), target.getUTCMonth() + 1, 0),
    ).getUTCDate();
    target.setUTCDate(Math.min(debt.paymentDay, lastDay));
    return {
      paymentsRemaining,
      estimatedPayoffDate: target.toISOString().slice(0, 10),
    };
  }

  private async require(id: string) {
    const debt = await this.prisma.debt.findFirst({
      where: { id, userId: DEFAULT_USER_ID },
    });
    if (!debt) throw new NotFoundException('Debt not found');
    return debt;
  }

  private withCalculations(debt: Debt) {
    const initialAmount = Number(debt.initialAmount);
    const currentAmount = Number(debt.currentAmount);
    const minimumPayment = Number(debt.minimumPayment);
    const paidAmount = Math.max(0, initialAmount - currentAmount);
    return {
      ...debt,
      paidAmount,
      progressPercent: initialAmount
        ? Math.min(100, (paidAmount / initialAmount) * 100)
        : 0,
      estimatedPaymentsRemaining: minimumPayment
        ? Math.ceil(currentAmount / minimumPayment)
        : null,
      nextPaymentDate: this.nextPaymentDate(debt.paymentDay),
    };
  }

  private nextPaymentDate(paymentDay: number) {
    const today = startOfUtcDay();
    const date = new Date(
      Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), 1),
    );
    const setPaymentDay = () => {
      const lastDay = new Date(
        Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + 1, 0),
      ).getUTCDate();
      date.setUTCDate(Math.min(paymentDay, lastDay));
    };
    setPaymentDay();
    if (date < today) {
      date.setUTCMonth(date.getUTCMonth() + 1, 1);
      setPaymentDay();
    }
    return date.toISOString().slice(0, 10);
  }
}
