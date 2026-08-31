import { Injectable } from '@nestjs/common';
import { startOfUtcDay } from '../../common';
import { PrismaService } from '../../prisma/prisma.service';
import { RoutinesService } from '../routines/routines.service';
import { ProjectsService } from '../projects/projects.service';
import { expectedIncomeInRange } from '../income/income-period.util';
@Injectable()
export class DashboardService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly routines: RoutinesService,
    private readonly projectsService: ProjectsService,
  ) {}
  async summary(userId: string) {
    const today = startOfUtcDay();
    const monthStart = new Date(
      Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), 1),
    );
    const weekStart = new Date(today);
    weekStart.setUTCDate(today.getUTCDate() - ((today.getUTCDay() + 6) % 7));
    const [
      settings,
      profile,
      month,
      week,
      recentExpenses,
      categoryTotals,
      debts,
      savingsGoals,
      incomeSources,
      recentIncomeEvents,
      currentBudget,
      upcomingPayments,
      habits,
      routineToday,
      activeProjects,
      projectsSummary,
    ] = await Promise.all([
      this.prisma.appSettings.findUnique({
        where: { userId },
      }),
      this.prisma.profile.findUnique({
        where: { userId },
      }),
      this.prisma.expense.aggregate({
        where: { userId, expenseDate: { gte: monthStart } },
        _sum: { amount: true },
      }),
      this.prisma.expense.aggregate({
        where: { userId, expenseDate: { gte: weekStart } },
        _sum: { amount: true },
      }),
      this.prisma.expense.findMany({
        where: { userId },
        include: { category: true },
        orderBy: [{ expenseDate: 'desc' }, { createdAt: 'desc' }],
        take: 5,
      }),
      this.prisma.expense.groupBy({
        by: ['categoryId'],
        where: { userId, expenseDate: { gte: monthStart } },
        _sum: { amount: true },
        orderBy: { _sum: { amount: 'desc' } },
        take: 5,
      }),
      this.prisma.debt.findMany({
        where: {
          userId,
          status: { in: ['active', 'paused', 'paid'] },
        },
        orderBy: { createdAt: 'asc' },
      }),
      this.prisma.savingsGoal.findMany({
        where: {
          userId,
          status: { in: ['active', 'paused', 'completed'] },
        },
        orderBy: { createdAt: 'asc' },
      }),
      this.prisma.incomeSource.findMany({
        where: { userId, isActive: true },
        orderBy: { createdAt: 'asc' },
      }),
      this.prisma.incomeEvent.findMany({
        where: { userId },
        include: { incomeSource: true },
        orderBy: [{ incomeDate: 'desc' }, { createdAt: 'desc' }],
        take: 5,
      }),
      this.prisma.budgetPeriod.findFirst({
        where: {
          userId,
          OR: [
            { status: 'active' },
            { startDate: { lte: today }, endDate: { gte: today } },
          ],
        },
        orderBy: [{ status: 'asc' }, { startDate: 'desc' }],
      }),
      this.prisma.recurringObligation.findMany({
        where: { userId, isActive: true },
        orderBy: [{ nextDueDate: 'asc' }, { createdAt: 'asc' }],
      }),
      this.prisma.habit.findMany({
        where: { userId, isActive: true },
        include: {
          logs: { where: { userId, logDate: today }, take: 1 },
        },
        orderBy: { moment: 'asc' },
      }),
      this.routines.getTodaySummary(userId),
      this.prisma.project.findMany({
        where: { userId, status: 'active' },
        include: {
          tasks: {
            where: { userId, status: { not: 'cancelled' } },
            select: { status: true },
          },
        },
        orderBy: { priority: 'desc' },
      }),
      this.projectsService.summary(userId),
    ]);
    const activeDebts = debts.filter((debt) => debt.status === 'active');
    const activeSavingsGoals = savingsGoals.filter(
      (goal) => goal.status === 'active',
    );
    const categories = await this.prisma.expenseCategory.findMany({
      where: {
        userId,
        id: { in: categoryTotals.map((item) => item.categoryId) },
      },
    });
    const categoryById = new Map(
      categories.map((category) => [category.id, category]),
    );
    const monthEnd = new Date(
      Date.UTC(today.getUTCFullYear(), today.getUTCMonth() + 1, 0),
    );
    const periodStart = currentBudget?.startDate ?? monthStart;
    const periodEnd = currentBudget?.endDate ?? monthEnd;
    const [periodExpenses, budgetLimits, actualIncome] = await Promise.all([
      this.prisma.expense.aggregate({
        where: {
          userId,
          expenseDate: { gte: periodStart, lte: periodEnd },
        },
        _sum: { amount: true },
      }),
      currentBudget
        ? this.prisma.budgetLimit.aggregate({
            where: {
              userId,
              budgetPeriodId: currentBudget.id,
            },
            _sum: { limitAmount: true },
          })
        : null,
      this.prisma.incomeEvent.aggregate({
        where: {
          userId,
          incomeDate: { gte: periodStart, lte: periodEnd },
        },
        _sum: { amount: true },
        _count: { _all: true },
      }),
    ]);
    const periodIncomeIsEstimated = actualIncome._count._all === 0;
    const periodIncome = periodIncomeIsEstimated
      ? expectedIncomeInRange(incomeSources, periodStart, periodEnd)
      : Number(actualIncome._sum.amount ?? 0);
    const periodSpent = Number(periodExpenses._sum.amount ?? 0);
    const upcomingTotal = upcomingPayments
      .filter(
        (payment) =>
          payment.nextDueDate &&
          payment.nextDueDate >= today &&
          payment.nextDueDate <= periodEnd,
      )
      .reduce((sum, payment) => sum + Number(payment.amount), 0);
    const totalLimit = Number(budgetLimits?._sum.limitAmount ?? 0);
    const remainingDays = Math.max(
      1,
      Math.floor(
        (periodEnd.getTime() -
          Math.max(today.getTime(), periodStart.getTime())) /
          86_400_000,
      ) + 1,
    );
    const totalDebt = debts.reduce(
      (sum, debt) => sum + Number(debt.currentAmount),
      0,
    );
    const totalDebtInitial = debts.reduce(
      (sum, debt) => sum + Number(debt.initialAmount),
      0,
    );
    const totalDebtPaid = Math.max(0, totalDebtInitial - totalDebt);
    const savingsCurrent = savingsGoals.reduce(
      (sum, goal) => sum + Number(goal.currentAmount),
      0,
    );
    const savingsTarget = savingsGoals.reduce(
      (sum, goal) => sum + Number(goal.targetAmount),
      0,
    );
    return {
      settings,
      onboardingCompleted: profile?.onboardingCompleted ?? false,
      availableToday:
        (periodIncome - periodSpent - upcomingTotal) / remainingDays,
      periodIncome,
      periodIncomeIsEstimated,
      periodSpent,
      budgetRemaining: currentBudget ? totalLimit - periodSpent : null,
      upcomingPayments,
      totalDebt,
      totalDebtPaid,
      debtProgressPercent: totalDebtInitial
        ? (totalDebtPaid / totalDebtInitial) * 100
        : 0,
      savingsCurrent,
      savingsTarget,
      savingsProgressPercent: savingsTarget
        ? (savingsCurrent / savingsTarget) * 100
        : 0,
      totalSavingsGoal: savingsTarget,
      currentMonthExpenses: month._sum.amount ?? 0,
      currentWeekExpenses: week._sum.amount ?? 0,
      recentExpenses,
      recentIncomeEvents,
      topCategories: categoryTotals.map((item) => ({
        category: categoryById.get(item.categoryId),
        amount: item._sum.amount ?? 0,
      })),
      activeDebts,
      activeSavingsGoals,
      habitsToday: habits.map(({ logs, ...habit }) => ({
        ...habit,
        log: logs[0] ?? null,
      })),
      routineToday,
      activeProjects: activeProjects.map(({ tasks, ...project }) => ({
        ...project,
        progress: tasks.length
          ? Math.round(
              (tasks.filter((task) =>
                ['done', 'completed'].includes(task.status),
              ).length /
                tasks.length) *
                100,
            )
          : 0,
      })),
      projects: {
        active: projectsSummary.active,
        nearCompletion: projectsSummary.nearCompletion,
        topProject: projectsSummary.highestProgressProject,
        upcomingTasks: projectsSummary.upcomingTasks,
      },
    };
  }
}
