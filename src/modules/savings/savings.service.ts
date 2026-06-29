import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
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
  getAll() {
    return this.prisma.savingsGoal.findMany({
      where: { userId: DEFAULT_USER_ID },
      orderBy: { createdAt: 'desc' },
    });
  }
  async get(id: string) {
    const goal = await this.prisma.savingsGoal.findFirst({
      where: { id, userId: DEFAULT_USER_ID },
    });
    if (!goal) throw new NotFoundException('Savings goal not found');
    return goal;
  }
  create(dto: CreateSavingsGoalDto) {
    return this.prisma.savingsGoal.create({
      data: {
        ...dto,
        targetDate: dto.targetDate ? new Date(dto.targetDate) : undefined,
        status: dto.status ?? 'active',
        userId: DEFAULT_USER_ID,
      },
    });
  }
  async update(id: string, dto: UpdateSavingsGoalDto) {
    await this.get(id);
    return this.prisma.savingsGoal.update({
      where: { id, userId: DEFAULT_USER_ID },
      data: {
        ...dto,
        targetDate: dto.targetDate ? new Date(dto.targetDate) : undefined,
      },
    });
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
}
