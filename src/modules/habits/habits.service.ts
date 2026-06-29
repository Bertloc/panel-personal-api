import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { DEFAULT_USER_ID, startOfUtcDay } from '../../common';
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
  getAll() {
    return this.prisma.habit.findMany({
      where: { userId: DEFAULT_USER_ID },
      orderBy: { name: 'asc' },
    });
  }
  async create(dto: CreateHabitDto) {
    if (
      await this.prisma.habit.findUnique({
        where: { userId_name: { userId: DEFAULT_USER_ID, name: dto.name } },
      })
    )
      throw new ConflictException('Habit name already exists');
    return this.prisma.habit.create({
      data: { ...dto, userId: DEFAULT_USER_ID },
    });
  }
  async update(id: string, dto: UpdateHabitDto) {
    await this.requireHabit(id);
    if (
      dto.name &&
      (await this.prisma.habit.findFirst({
        where: { userId: DEFAULT_USER_ID, name: dto.name, NOT: { id } },
      }))
    )
      throw new ConflictException('Habit name already exists');
    return this.prisma.habit.update({
      where: { id, userId: DEFAULT_USER_ID },
      data: dto,
    });
  }
  getToday() {
    const today = startOfUtcDay();
    return this.prisma.habit
      .findMany({
        where: { userId: DEFAULT_USER_ID, isActive: true },
        include: {
          logs: { where: { userId: DEFAULT_USER_ID, logDate: today }, take: 1 },
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
  async log(id: string, dto: LogHabitDto) {
    await this.requireHabit(id);
    const logDate = new Date(dto.logDate);
    return this.prisma.habitLog.upsert({
      where: {
        userId_habitId_logDate: {
          userId: DEFAULT_USER_ID,
          habitId: id,
          logDate,
        },
      },
      create: { ...dto, logDate, habitId: id, userId: DEFAULT_USER_ID },
      update: { status: dto.status, note: dto.note },
    });
  }
  async updateLog(habitId: string, logId: string, dto: UpdateHabitLogDto) {
    await this.requireHabit(habitId);
    const log = await this.prisma.habitLog.findFirst({
      where: { id: logId, habitId, userId: DEFAULT_USER_ID },
    });
    if (!log) throw new NotFoundException('Habit log not found');
    return this.prisma.habitLog.update({
      where: { id: logId, userId: DEFAULT_USER_ID },
      data: {
        ...dto,
        logDate: dto.logDate ? new Date(dto.logDate) : undefined,
      },
    });
  }
  private async requireHabit(id: string) {
    const habit = await this.prisma.habit.findFirst({
      where: { id, userId: DEFAULT_USER_ID },
    });
    if (!habit) throw new NotFoundException('Habit not found');
    return habit;
  }
}
