import { nextUtcDay } from '../../common';
import { PrismaService } from '../../prisma/prisma.service';

export interface RoutineDaySummary {
  completionPercent: number;
}

export async function calculateDailyProgress(
  prisma: PrismaService,
  date: Date,
  userId: string,
  routine: RoutineDaySummary,
) {
  const [expenseCount, dailyExpense, keyLog, saved, paid, period] =
    await Promise.all([
      prisma.expense.count({ where: { userId, expenseDate: date } }),
      prisma.expense.aggregate({
        where: { userId, expenseDate: date },
        _sum: { amount: true },
      }),
      // ponytail: keep this legacy metric until RoutineItem models financial/key flags.
      prisma.habitLog.count({
        where: {
          userId,
          logDate: date,
          status: 'completed',
          habit: { userId, isFinancial: true, isKeyHabit: true },
        },
      }),
      prisma.savingsMovement.count({
        where: { userId, movementDate: date, movementType: 'deposit' },
      }),
      prisma.debtPayment.count({ where: { userId, paymentDate: date } }),
      prisma.budgetPeriod.findFirst({
        where: { userId, startDate: { lte: date }, endDate: { gte: date } },
        include: { limits: { where: { userId } } },
      }),
    ]);
  const periodDays = period
    ? Math.round(
        (nextUtcDay(period.endDate).getTime() - period.startDate.getTime()) /
          86_400_000,
      )
    : 0;
  const dailyLimit = period
    ? period.limits.reduce((sum, limit) => sum + Number(limit.limitAmount), 0) /
      periodDays
    : 0;
  const expenseRegistered = expenseCount > 0;
  const withinDailyLimit =
    Boolean(period?.limits.length) &&
    Number(dailyExpense._sum.amount ?? 0) <= dailyLimit;
  const habitsCompletionRate = routine.completionPercent;
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
  return prisma.dailyProgress.upsert({
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
