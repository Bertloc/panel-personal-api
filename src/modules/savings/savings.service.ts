import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma, SavingsGoal } from '@prisma/client';
import { DEFAULT_USER_ID } from '../../common';
import { PrismaService } from '../../prisma/prisma.service';
import {
  CreateSavingsGoalDto,
  CreateSavingsMovementDto,
  UpdateSavingsGoalDto,
} from './savings.dto';
@Injectable()
export class SavingsService {
  constructor(private readonly prisma: PrismaService) {}
  async getAll() {
    const goals = await this.prisma.savingsGoal.findMany({
      where: { userId: DEFAULT_USER_ID },
      orderBy: { createdAt: 'desc' },
    });
    return goals.map((goal) => this.withCalculations(goal));
  }
  async get(id: string) {
    const goal = await this.prisma.savingsGoal.findFirst({
      where: { id, userId: DEFAULT_USER_ID },
    });
    if (!goal) throw new NotFoundException('Savings goal not found');
    return this.withCalculations(goal);
  }
  async create(dto: CreateSavingsGoalDto) {
    const goal = await this.prisma.savingsGoal.create({
      data: {
        ...dto,
        targetDate: dto.targetDate ? new Date(dto.targetDate) : undefined,
        status: dto.status ?? 'active',
        userId: DEFAULT_USER_ID,
      },
    });
    return this.withCalculations(goal);
  }
  async update(id: string, dto: UpdateSavingsGoalDto) {
    await this.get(id);
    const goal = await this.prisma.savingsGoal.update({
      where: { id, userId: DEFAULT_USER_ID },
      data: {
        ...dto,
        targetDate: dto.targetDate ? new Date(dto.targetDate) : undefined,
      },
    });
    return this.withCalculations(goal);
  }
  async remove(id: string) {
    await this.get(id);
    const goal = await this.prisma.savingsGoal.update({
      where: { id, userId: DEFAULT_USER_ID },
      data: { status: 'cancelled' },
    });
    return this.withCalculations(goal);
  }
  async addMovement(id: string, dto: CreateSavingsMovementDto) {
    const goal = await this.get(id);
    const delta = dto.movementType === 'withdrawal' ? -dto.amount : dto.amount;
    const balance = new Prisma.Decimal(goal.currentAmount).plus(delta);
    if (balance.isNegative())
      throw new BadRequestException('Movement cannot leave savings below zero');
    return this.prisma.$transaction(async (tx) => {
      const movement = await tx.savingsMovement.create({
        data: {
          ...dto,
          movementDate: new Date(dto.movementDate),
          savingsGoalId: id,
          userId: DEFAULT_USER_ID,
        },
      });
      await tx.savingsGoal.update({
        where: { id, userId: DEFAULT_USER_ID },
        data: {
          currentAmount: balance,
          status: balance.greaterThanOrEqualTo(goal.targetAmount)
            ? 'completed'
            : goal.status,
        },
      });
      return movement;
    });
  }
  async getMovements(id: string) {
    await this.get(id);
    return this.prisma.savingsMovement.findMany({
      where: { savingsGoalId: id, userId: DEFAULT_USER_ID },
      orderBy: { movementDate: 'desc' },
    });
  }

  private withCalculations(goal: SavingsGoal) {
    const targetAmount = Number(goal.targetAmount);
    const currentAmount = Number(goal.currentAmount);
    const remainingAmount = Math.max(0, targetAmount - currentAmount);
    let monthlySuggestedAmount: number | null = null;
    if (goal.targetDate) {
      const today = new Date();
      // ponytail: calendar-month estimate; add contribution schedules when exact dates matter.
      const months = Math.max(
        1,
        (goal.targetDate.getUTCFullYear() - today.getUTCFullYear()) * 12 +
          goal.targetDate.getUTCMonth() -
          today.getUTCMonth() +
          Number(goal.targetDate.getUTCDate() > today.getUTCDate()),
      );
      monthlySuggestedAmount = remainingAmount / months;
    }
    return {
      ...goal,
      progressPercent: targetAmount
        ? Math.min(100, (currentAmount / targetAmount) * 100)
        : 0,
      remainingAmount,
      monthlySuggestedAmount,
    };
  }
}
