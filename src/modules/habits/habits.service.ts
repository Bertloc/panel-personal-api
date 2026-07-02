import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { startOfUtcDay } from '../../common';
import { PrismaService } from '../../prisma/prisma.service';
import {
  CreateHabitDto,
  LogHabitDto,
  UpdateHabitDto,
  UpdateHabitLogDto,
} from './habits.dto';
@Injectable()
export class HabitsService {
  constructor(private readonly prisma: PrismaService) {}
  getAll(userId: string) {
    return this.prisma.habit.findMany({
      where: { userId },
      orderBy: { name: 'asc' },
    });
  }
  async create(dto: CreateHabitDto, userId: string) {
    if (
      await this.prisma.habit.findUnique({
        where: { userId_name: { userId, name: dto.name } },
      })
    )
      throw new ConflictException('Habit name already exists');
    return this.prisma.habit.create({
      data: { ...dto, userId },
    });
  }
  async update(id: string, dto: UpdateHabitDto, userId: string) {
    await this.requireHabit(id, userId);
    if (
      dto.name &&
      (await this.prisma.habit.findFirst({
        where: { userId, name: dto.name, NOT: { id } },
      }))
    )
      throw new ConflictException('Habit name already exists');
    return this.prisma.habit.update({
      where: { id, userId },
      data: dto,
    });
  }
  getToday(userId: string) {
    const today = startOfUtcDay();
    return this.prisma.habit
      .findMany({
        where: { userId, isActive: true },
        include: {
          logs: { where: { userId, logDate: today }, take: 1 },
        },
        orderBy: [{ moment: 'asc' }, { name: 'asc' }],
      })
      .then((habits) =>
        habits.map(({ logs, ...habit }) => ({
          ...habit,
          log: logs[0] ?? null,
        })),
      );
  }
  async log(id: string, dto: LogHabitDto, userId: string) {
    await this.requireHabit(id, userId);
    const logDate = new Date(dto.logDate);
    return this.prisma.habitLog.upsert({
      where: {
        userId_habitId_logDate: {
          userId,
          habitId: id,
          logDate,
        },
      },
      create: { ...dto, logDate, habitId: id, userId },
      update: { status: dto.status, note: dto.note },
    });
  }
  async updateLog(
    habitId: string,
    logId: string,
    dto: UpdateHabitLogDto,
    userId: string,
  ) {
    await this.requireHabit(habitId, userId);
    const log = await this.prisma.habitLog.findFirst({
      where: { id: logId, habitId, userId },
    });
    if (!log) throw new NotFoundException('Habit log not found');
    return this.prisma.habitLog.update({
      where: { id: logId, userId },
      data: {
        ...dto,
        logDate: dto.logDate ? new Date(dto.logDate) : undefined,
      },
    });
  }
  private async requireHabit(id: string, userId: string) {
    const habit = await this.prisma.habit.findFirst({
      where: { id, userId },
    });
    if (!habit) throw new NotFoundException('Habit not found');
    return habit;
  }
}
