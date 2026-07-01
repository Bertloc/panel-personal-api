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
  UpdateSavingsMovementDto,
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
    const movementType = this.movementType(dto.type ?? dto.movementType);
    const delta = this.movementDelta(movementType, dto.amount);
    const balance = new Prisma.Decimal(goal.currentAmount).plus(delta);
    if (balance.isNegative())
      throw new BadRequestException('Movement cannot leave savings below zero');
    return this.prisma.$transaction(async (tx) => {
      const movement = await tx.savingsMovement.create({
        data: {
          amount: dto.amount,
          movementDate: new Date(dto.movementDate),
          movementType,
          note: dto.note,
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
  async updateMovement(id: string, dto: UpdateSavingsMovementDto) {
    const movement = await this.requireMovement(id);
    const amount = new Prisma.Decimal(dto.amount ?? movement.amount);
    const movementType =
      dto.type || dto.movementType
        ? this.movementType(dto.type ?? dto.movementType)
        : movement.movementType;
    const balance = new Prisma.Decimal(movement.savingsGoal.currentAmount)
      .minus(this.movementDelta(movement.movementType, movement.amount))
      .plus(this.movementDelta(movementType, amount));
    if (balance.isNegative())
      throw new BadRequestException('Movement cannot leave savings below zero');
    return this.prisma.$transaction(async (tx) => {
      const updated = await tx.savingsMovement.update({
        where: { id, userId: DEFAULT_USER_ID },
        data: {
          amount,
          movementDate: dto.movementDate
            ? new Date(dto.movementDate)
            : undefined,
          movementType,
          note: dto.note,
        },
      });
      await tx.savingsGoal.update({
        where: {
          id: movement.savingsGoalId,
          userId: DEFAULT_USER_ID,
        },
        data: {
          currentAmount: balance,
          status: this.statusAfterBalance(
            movement.savingsGoal.status,
            balance,
            movement.savingsGoal.targetAmount,
          ),
        },
      });
      return updated;
    });
  }
  async removeMovement(id: string) {
    const movement = await this.requireMovement(id);
    const balance = new Prisma.Decimal(
      movement.savingsGoal.currentAmount,
    ).minus(this.movementDelta(movement.movementType, movement.amount));
    if (balance.isNegative())
      throw new BadRequestException('Movement cannot be safely reverted');
    return this.prisma.$transaction(async (tx) => {
      await tx.savingsMovement.delete({
        where: { id, userId: DEFAULT_USER_ID },
      });
      await tx.savingsGoal.update({
        where: {
          id: movement.savingsGoalId,
          userId: DEFAULT_USER_ID,
        },
        data: {
          currentAmount: balance,
          status: this.statusAfterBalance(
            movement.savingsGoal.status,
            balance,
            movement.savingsGoal.targetAmount,
          ),
        },
      });
      return { deleted: true };
    });
  }

  private async requireMovement(id: string) {
    const movement = await this.prisma.savingsMovement.findFirst({
      where: { id, userId: DEFAULT_USER_ID },
      include: { savingsGoal: true },
    });
    if (!movement) throw new NotFoundException('Savings movement not found');
    return movement;
  }

  private movementType(type?: string) {
    if (!type) throw new BadRequestException('Movement type is required');
    return type;
  }

  private movementDelta(type: string, amount: Prisma.Decimal.Value) {
    const value = new Prisma.Decimal(amount);
    return type === 'withdrawal' ? value.negated() : value;
  }

  private statusAfterBalance(
    status: string,
    balance: Prisma.Decimal,
    target: Prisma.Decimal.Value,
  ) {
    if (balance.greaterThanOrEqualTo(target)) return 'completed';
    return status === 'completed' ? 'active' : status;
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
