import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { DEFAULT_USER_ID } from '../../common';
import { PrismaService } from '../../prisma/prisma.service';
import {
  CreateDebtDto,
  CreateDebtPaymentDto,
  UpdateDebtDto,
} from './debts.dto';

@Injectable()
export class DebtsService {
  constructor(private readonly prisma: PrismaService) {}
  getAll() {
    return this.prisma.debt.findMany({
      where: { userId: DEFAULT_USER_ID },
      orderBy: { createdAt: 'desc' },
    });
  }
  async get(id: string) {
    const debt = await this.prisma.debt.findFirst({
      where: { id, userId: DEFAULT_USER_ID },
    });
    if (!debt) throw new NotFoundException('Debt not found');
    return debt;
  }
  create(dto: CreateDebtDto) {
    return this.prisma.debt.create({
      data: {
        ...dto,
        currentAmount: dto.initialAmount,
        status: dto.status ?? 'active',
        userId: DEFAULT_USER_ID,
      },
    });
  }
  async update(id: string, dto: UpdateDebtDto) {
    await this.get(id);
    return this.prisma.debt.update({
      where: { id, userId: DEFAULT_USER_ID },
      data: dto,
    });
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
    const debt = await this.get(id);
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
}
