import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { nextUtcDay, startOfUtcDay } from '../../common';
import { PrismaService } from '../../prisma/prisma.service';
import { calculateDailyProgress } from '../progress/daily-progress';
import {
  CreateRoutineDto,
  CreateRoutineItemDto,
  CreateRoutineLogDto,
  RoutineHistoryQueryDto,
  RoutineQueryDto,
  RoutineSummaryQueryDto,
  RoutineTodayQueryDto,
  UpdateRoutineDto,
  UpdateRoutineItemDto,
  UpdateRoutineLogDto,
} from './routines.dto';

@Injectable()
export class RoutinesService {
  constructor(private readonly prisma: PrismaService) {}

  async getAll(query: RoutineQueryDto, userId: string) {
    const routines = await this.prisma.routine.findMany({
      where: {
        userId,
        status:
          query.status ??
          (query.includeArchived ? undefined : { not: 'archived' }),
      },
      include: {
        _count: { select: { items: { where: { isActive: true } } } },
        items: query.includeItems
          ? {
              where: { isActive: true },
              orderBy: [{ order: 'asc' }, { createdAt: 'asc' }],
            }
          : false,
      },
      orderBy: { createdAt: 'desc' },
    });
    return routines.map(({ _count, ...routine }) => ({
      ...routine,
      itemsCount: _count.items,
    }));
  }

  async create(dto: CreateRoutineDto, userId: string) {
    const { daysOfWeek, ...data } = dto;
    return this.prisma.$transaction(async (tx) => {
      const routine = await tx.routine.create({
        data: { ...data, userId },
      });
      if (daysOfWeek)
        await this.syncSchedules(tx, routine.id, null, daysOfWeek, userId);
      return routine;
    });
  }

  async get(id: string, userId: string) {
    const routine = await this.prisma.routine.findFirst({
      where: { id, userId },
      include: {
        items: { orderBy: [{ order: 'asc' }, { createdAt: 'asc' }] },
        schedules: { orderBy: { dayOfWeek: 'asc' } },
      },
    });
    if (!routine) throw new NotFoundException('Routine not found');
    return routine;
  }

  async update(id: string, dto: UpdateRoutineDto, userId: string) {
    await this.requireRoutine(id, userId);
    const { daysOfWeek, ...data } = dto;
    return this.prisma.$transaction(async (tx) => {
      const routine = await tx.routine.update({
        where: { id, userId },
        data,
      });
      if (daysOfWeek)
        await this.syncSchedules(tx, id, null, daysOfWeek, userId);
      return routine;
    });
  }

  async remove(id: string, userId: string) {
    await this.requireRoutine(id, userId);
    return this.prisma.routine.update({
      where: { id, userId },
      data: { status: 'archived' },
    });
  }

  async getItems(routineId: string, userId: string) {
    await this.requireRoutine(routineId, userId);
    return this.prisma.routineItem.findMany({
      where: { userId, routineId },
      include: { schedules: { orderBy: { dayOfWeek: 'asc' } } },
      orderBy: [{ order: 'asc' }, { createdAt: 'asc' }],
    });
  }

  async createItem(
    routineId: string,
    dto: CreateRoutineItemDto,
    userId: string,
  ) {
    await this.requireRoutine(routineId, userId);
    const { daysOfWeek, ...data } = dto;
    return this.prisma.$transaction(async (tx) => {
      const item = await tx.routineItem.create({
        data: { ...data, routineId, userId },
      });
      if (daysOfWeek)
        await this.syncSchedules(tx, routineId, item.id, daysOfWeek, userId);
      return item;
    });
  }

  async updateItem(id: string, dto: UpdateRoutineItemDto, userId: string) {
    const item = await this.requireItem(id, userId);
    const { daysOfWeek, ...data } = dto;
    return this.prisma.$transaction(async (tx) => {
      const updated = await tx.routineItem.update({
        where: { id, userId },
        data,
      });
      if (daysOfWeek)
        await this.syncSchedules(tx, item.routineId, id, daysOfWeek, userId);
      return updated;
    });
  }

  async removeItem(id: string, userId: string) {
    await this.requireItem(id, userId);
    return this.prisma.routineItem.update({
      where: { id, userId },
      data: { isActive: false },
    });
  }

  async getToday(query: RoutineTodayQueryDto, userId: string) {
    const date = await this.resolveDate(query.date, userId);
    const routines = await this.loadRoutines(date, date, userId);
    return this.dayResult(date, routines);
  }

  async getTodaySummary(userId: string) {
    return (await this.getToday({}, userId)).summary;
  }

  async getSummaryForDate(date: Date, userId: string) {
    const routines = await this.loadRoutines(date, date, userId);
    return this.dayResult(date, routines).summary;
  }

  async createLog(dto: CreateRoutineLogDto, userId: string) {
    const item = await this.requireItem(dto.routineItemId, userId);
    if (item.routineId !== dto.routineId)
      throw new BadRequestException('Routine item does not belong to routine');
    const logDate = this.parseDate(dto.logDate);
    const log = await this.prisma.routineLog.upsert({
      where: {
        userId_routineItemId_logDate: {
          userId,
          routineItemId: dto.routineItemId,
          logDate,
        },
      },
      create: { ...dto, logDate, userId },
      update: { status: dto.status, note: dto.note, routineId: dto.routineId },
    });
    await this.recalculateProgress(logDate, userId);
    return log;
  }

  async updateLog(id: string, dto: UpdateRoutineLogDto, userId: string) {
    const current = await this.requireLog(id, userId);
    const log = await this.prisma.routineLog.update({
      where: { id, userId },
      data: dto,
    });
    await this.recalculateProgress(current.logDate, userId);
    return log;
  }

  async removeLog(id: string, userId: string) {
    const current = await this.requireLog(id, userId);
    const log = await this.prisma.routineLog.delete({
      where: { id, userId },
    });
    await this.recalculateProgress(current.logDate, userId);
    return log;
  }

  async history(query: RoutineHistoryQueryDto, userId: string) {
    const endDate = await this.resolveDate(query.endDate, userId);
    const startDate = query.startDate
      ? this.parseDate(query.startDate)
      : new Date(Date.UTC(endDate.getUTCFullYear(), endDate.getUTCMonth(), 1));
    if (startDate > endDate)
      throw new BadRequestException(
        'startDate must be before or equal to endDate',
      );
    if ((endDate.getTime() - startDate.getTime()) / 86_400_000 > 366)
      throw new BadRequestException('History range cannot exceed 366 days');
    if (query.routineId) await this.requireRoutine(query.routineId, userId);
    return {
      startDate: this.dateString(startDate),
      endDate: this.dateString(endDate),
      days: await this.historyDays(startDate, endDate, userId, query.routineId),
    };
  }

  async summary(query: RoutineSummaryQueryDto, userId: string) {
    const date = await this.resolveDate(query.date, userId);
    const today = (await this.getToday({ date: this.dateString(date) }, userId))
      .summary;
    const weekStart = new Date(date);
    weekStart.setUTCDate(date.getUTCDate() - ((date.getUTCDay() + 6) % 7));
    const weekEnd = new Date(weekStart);
    weekEnd.setUTCDate(weekStart.getUTCDate() + 6);
    const weekDays = await this.historyDays(weekStart, weekEnd, userId);
    const activeWeekDays = weekDays.filter((day) => day.total > 0);
    const completedDays = activeWeekDays.filter(
      (day) => day.completionPercent >= 80,
    ).length;
    const streakStart = new Date(date);
    streakStart.setUTCDate(date.getUTCDate() - 364);
    const streakDays = (
      await this.historyDays(streakStart, date, userId)
    ).filter((day) => day.total > 0);
    let current = 0;
    for (let index = streakDays.length - 1; index >= 0; index--) {
      if (streakDays[index].completionPercent < 80) break;
      current++;
    }
    let best = 0;
    let run = 0;
    for (const day of streakDays) {
      run = day.completionPercent >= 80 ? run + 1 : 0;
      best = Math.max(best, run);
    }
    return {
      today,
      week: {
        activeDays: activeWeekDays.length,
        completedDays,
        completionPercent: activeWeekDays.length
          ? (completedDays / activeWeekDays.length) * 100
          : 0,
      },
      streak: { current, best },
    };
  }

  private async historyDays(
    startDate: Date,
    endDate: Date,
    userId: string,
    routineId?: string,
  ) {
    // ponytail: history uses current schedules; add effective dates if edits must preserve past expectations.
    const routines = await this.loadRoutines(
      startDate,
      endDate,
      userId,
      routineId,
    );
    const days: ({ date: string } & ReturnType<
      RoutinesService['summarize']
    >)[] = [];
    for (
      let date = new Date(startDate);
      date <= endDate;
      date = nextUtcDay(date)
    ) {
      const result = this.dayResult(date, routines);
      days.push({ date: result.date, ...result.summary });
    }
    return days;
  }

  private loadRoutines(
    startDate: Date,
    endDate: Date,
    userId: string,
    routineId?: string,
  ) {
    return this.prisma.routine.findMany({
      where: { id: routineId, userId, status: 'active' },
      include: {
        schedules: { where: { userId } },
        items: {
          where: { userId, isActive: true },
          include: {
            logs: {
              where: {
                userId,
                logDate: { gte: startDate, lte: endDate },
              },
            },
          },
          orderBy: [{ order: 'asc' }, { createdAt: 'asc' }],
        },
      },
      orderBy: { createdAt: 'asc' },
    });
  }

  private dayResult(
    date: Date,
    routines: Awaited<ReturnType<RoutinesService['loadRoutines']>>,
  ) {
    const dayOfWeek = date.getUTCDay();
    const dateKey = this.dateString(date);
    const items = routines.flatMap((routine) =>
      routine.items
        .filter((item) =>
          this.appliesToday(routine.schedules, item.id, dayOfWeek),
        )
        .map((item) => {
          const log = item.logs.find(
            (candidate) => this.dateString(candidate.logDate) === dateKey,
          );
          return {
            routineId: routine.id,
            routineName: routine.name,
            itemId: item.id,
            title: item.title,
            description: item.description,
            priority: item.priority,
            isRequired: item.isRequired,
            status: log?.status ?? 'pending',
            logId: log?.id ?? null,
          };
        }),
    );
    const summary = this.summarize(items);
    return { date: dateKey, dayOfWeek, items, summary };
  }

  private appliesToday(
    schedules: {
      routineItemId: string | null;
      dayOfWeek: number;
      isActive: boolean;
    }[],
    itemId: string,
    dayOfWeek: number,
  ) {
    const itemSchedules = schedules.filter(
      (schedule) => schedule.routineItemId === itemId,
    );
    const applicable = itemSchedules.length
      ? itemSchedules
      : schedules.filter((schedule) => schedule.routineItemId === null);
    return applicable.length
      ? applicable.some(
          (schedule) => schedule.isActive && schedule.dayOfWeek === dayOfWeek,
        )
      : true;
  }

  private summarize(items: { status: string }[]) {
    const summary = {
      total: items.length,
      done: 0,
      pending: 0,
      skipped: 0,
      missed: 0,
      completionPercent: 0,
    };
    for (const item of items) {
      if (item.status in summary && item.status !== 'completionPercent')
        summary[item.status as 'done' | 'pending' | 'skipped' | 'missed']++;
    }
    summary.completionPercent = summary.total
      ? (summary.done / summary.total) * 100
      : 0;
    return summary;
  }

  private async syncSchedules(
    tx: Prisma.TransactionClient,
    routineId: string,
    routineItemId: string | null,
    daysOfWeek: number[],
    userId: string,
  ) {
    const schedules = await tx.routineSchedule.findMany({
      where: { userId, routineId, routineItemId },
      orderBy: { createdAt: 'asc' },
    });
    const enabled = new Set<number>();
    for (const schedule of schedules) {
      const isActive =
        daysOfWeek.includes(schedule.dayOfWeek) &&
        !enabled.has(schedule.dayOfWeek);
      if (isActive) enabled.add(schedule.dayOfWeek);
      await tx.routineSchedule.update({
        where: { id: schedule.id },
        data: { isActive },
      });
    }
    for (const dayOfWeek of daysOfWeek) {
      if (enabled.has(dayOfWeek)) continue;
      await tx.routineSchedule.create({
        data: {
          userId,
          routineId,
          routineItemId,
          dayOfWeek,
        },
      });
    }
  }

  private async resolveDate(input: string | undefined, userId: string) {
    if (input) return this.parseDate(input);
    const profile = await this.prisma.profile.findUnique({
      where: { userId },
      select: { timezone: true },
    });
    try {
      const parts = new Intl.DateTimeFormat('en-US', {
        timeZone: profile?.timezone ?? 'UTC',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
      }).formatToParts(new Date());
      const value = Object.fromEntries(
        parts.map((part) => [part.type, part.value]),
      );
      return this.parseDate(`${value.year}-${value.month}-${value.day}`);
    } catch {
      return startOfUtcDay();
    }
  }

  private parseDate(value: string) {
    return new Date(`${value.slice(0, 10)}T00:00:00.000Z`);
  }

  private dateString(value: Date) {
    return value.toISOString().slice(0, 10);
  }

  private async recalculateProgress(date: Date, userId: string) {
    const routine = await this.getSummaryForDate(date, userId);
    await calculateDailyProgress(this.prisma, date, userId, routine);
  }

  private async requireRoutine(id: string, userId: string) {
    const routine = await this.prisma.routine.findFirst({
      where: { id, userId },
    });
    if (!routine) throw new NotFoundException('Routine not found');
    return routine;
  }

  private async requireItem(id: string, userId: string) {
    const item = await this.prisma.routineItem.findFirst({
      where: { id, userId },
    });
    if (!item) throw new NotFoundException('Routine item not found');
    return item;
  }

  private async requireLog(id: string, userId: string) {
    const log = await this.prisma.routineLog.findFirst({
      where: { id, userId },
    });
    if (!log) throw new NotFoundException('Routine log not found');
    return log;
  }
}
