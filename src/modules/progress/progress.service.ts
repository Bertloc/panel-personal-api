import { BadRequestException, Injectable } from '@nestjs/common';
import { DailyProgress } from '@prisma/client';
import { nextUtcDay, startOfUtcDay } from '../../common';
import { PrismaService } from '../../prisma/prisma.service';
import { HeatmapQueryDto, RecalculateProgressDto } from './progress.dto';
@Injectable()
export class ProgressService {
  constructor(private readonly prisma: PrismaService) {}
  async getToday(userId: string) {
    const date = startOfUtcDay();
    return (
      (await this.prisma.dailyProgress.findUnique({
        where: {
          userId_progressDate_filterType: {
            userId,
            progressDate: date,
            filterType: 'general',
          },
        },
      })) ?? this.calculate(date, userId)
    );
  }
  getHeatmap(query: HeatmapQueryDto, userId: string) {
    const year = query.year ?? new Date().getUTCFullYear();
    const filterType = query.filter ?? query.filterType ?? 'general';
    return this.prisma.dailyProgress.findMany({
      where: {
        userId,
        filterType,
        progressDate: {
          gte: new Date(Date.UTC(year, 0, 1)),
          lt: new Date(Date.UTC(year + 1, 0, 1)),
        },
      },
      orderBy: { progressDate: 'asc' },
    });
  }
  async recalculate(dto: RecalculateProgressDto, userId: string) {
    const start = startOfUtcDay(
      new Date(dto.date ?? dto.startDate ?? Date.now()),
    );
    const end = startOfUtcDay(
      new Date(dto.date ?? dto.endDate ?? dto.startDate ?? Date.now()),
    );
    if (start > end)
      throw new BadRequestException(
        'startDate must be before or equal to endDate',
      );
    const days = Math.round((end.getTime() - start.getTime()) / 86400000) + 1;
    if (days > 366)
      throw new BadRequestException('Date range cannot exceed 366 days');
    const results: DailyProgress[] = [];
    for (let date = start; date <= end; date = nextUtcDay(date))
      results.push(await this.calculate(date, userId));
    return results;
  }
  private async calculate(date: Date, userId: string) {
    const [
      expenseCount,
      dailyExpense,
      habits,
      completedLogs,
      keyLog,
      saved,
      paid,
      period,
    ] = await Promise.all([
      this.prisma.expense.count({
        where: { userId, expenseDate: date },
      }),
      this.prisma.expense.aggregate({
        where: { userId, expenseDate: date },
        _sum: { amount: true },
      }),
      this.prisma.habit.count({
        where: { userId, isActive: true },
      }),
      this.prisma.habitLog.count({
        where: {
          userId,
          logDate: date,
          status: 'completed',
          habit: { userId, isActive: true },
        },
      }),
      this.prisma.habitLog.count({
        where: {
          userId,
          logDate: date,
          status: 'completed',
          habit: {
            userId,
            isFinancial: true,
            isKeyHabit: true,
          },
        },
      }),
      this.prisma.savingsMovement.count({
        where: {
          userId,
          movementDate: date,
          movementType: 'deposit',
        },
      }),
      this.prisma.debtPayment.count({
        where: { userId, paymentDate: date },
      }),
      this.prisma.budgetPeriod.findFirst({
        where: {
          userId,
          startDate: { lte: date },
          endDate: { gte: date },
        },
        include: { limits: { where: { userId } } },
      }),
    ]);
    const periodDays = period
      ? Math.round(
          (nextUtcDay(period.endDate).getTime() - period.startDate.getTime()) /
            86400000,
        )
      : 0;
    const dailyLimit = period
      ? period.limits.reduce(
          (sum, limit) => sum + Number(limit.limitAmount),
          0,
        ) / periodDays
      : 0;
    const expenseRegistered = expenseCount > 0;
    const withinDailyLimit =
      Boolean(period?.limits.length) &&
      Number(dailyExpense._sum.amount ?? 0) <= dailyLimit;
    const habitsCompletionRate = habits ? (completedLogs / habits) * 100 : 0;
    const financialKeyHabitDone = keyLog > 0;
    const savedOrPaidDebt = saved + paid > 0;
    const score =
      Number(expenseRegistered) +
      Number(withinDailyLimit) +
      Number(habitsCompletionRate >= 60) +
      Number(financialKeyHabitDone) +
      Number(savedOrPaidDebt);
    const value = Math.min(score, 4);
    const state = ['empty', 'low', 'medium', 'good', 'excellent'][value];
    return this.prisma.dailyProgress.upsert({
      where: {
        userId_progressDate_filterType: {
          userId,
          progressDate: date,
          filterType: 'general',
        },
      },
      create: {
        userId,
        progressDate: date,
        filterType: 'general',
        score,
        value,
        state,
        expenseRegistered,
        withinDailyLimit,
        habitsCompletionRate,
        financialKeyHabitDone,
        savedOrPaidDebt,
      },
      update: {
        score,
        value,
        state,
        expenseRegistered,
        withinDailyLimit,
        habitsCompletionRate,
        financialKeyHabitDone,
        savedOrPaidDebt,
      },
    });
  }
}
