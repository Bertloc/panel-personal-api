import { Injectable } from '@nestjs/common';
import { DEFAULT_USER_ID, startOfUtcDay } from '../../common';
import { PrismaService } from '../../prisma/prisma.service';
@Injectable()
export class DashboardService {
  constructor(private readonly prisma: PrismaService) {}
  async summary() {
    const today = startOfUtcDay();
    const monthStart = new Date(
      Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), 1),
    );
    const weekStart = new Date(today);
    weekStart.setUTCDate(today.getUTCDate() - ((today.getUTCDay() + 6) % 7));
    const [
      settings,
      month,
      week,
      recentExpenses,
      categoryTotals,
      activeDebts,
      activeSavingsGoals,
      habits,
      activeProjects,
    ] = await Promise.all([
      this.prisma.appSettings.findUnique({
        where: { userId: DEFAULT_USER_ID },
      }),
      this.prisma.expense.aggregate({
        where: { userId: DEFAULT_USER_ID, expenseDate: { gte: monthStart } },
        _sum: { amount: true },
      }),
      this.prisma.expense.aggregate({
        where: { userId: DEFAULT_USER_ID, expenseDate: { gte: weekStart } },
        _sum: { amount: true },
      }),
      this.prisma.expense.findMany({
        where: { userId: DEFAULT_USER_ID },
        include: { category: true },
        orderBy: [{ expenseDate: 'desc' }, { createdAt: 'desc' }],
        take: 5,
      }),
      this.prisma.expense.groupBy({
        by: ['categoryId'],
        where: { userId: DEFAULT_USER_ID, expenseDate: { gte: monthStart } },
        _sum: { amount: true },
        orderBy: { _sum: { amount: 'desc' } },
        take: 5,
      }),
      this.prisma.debt.findMany({
        where: { userId: DEFAULT_USER_ID, status: 'active' },
        orderBy: { createdAt: 'asc' },
      }),
      this.prisma.savingsGoal.findMany({
        where: { userId: DEFAULT_USER_ID, status: 'active' },
        orderBy: { createdAt: 'asc' },
      }),
      this.prisma.habit.findMany({
        where: { userId: DEFAULT_USER_ID, isActive: true },
        include: {
          logs: { where: { userId: DEFAULT_USER_ID, logDate: today }, take: 1 },
        },
        orderBy: { moment: 'asc' },
      }),
      this.prisma.project.findMany({
        where: { userId: DEFAULT_USER_ID, status: 'active' },
        include: {
          tasks: {
            where: { userId: DEFAULT_USER_ID },
            select: { status: true },
          },
        },
        orderBy: { priority: 'desc' },
      }),
    ]);
    const categories = await this.prisma.expenseCategory.findMany({
      where: {
        userId: DEFAULT_USER_ID,
        id: { in: categoryTotals.map((item) => item.categoryId) },
      },
    });
    const categoryById = new Map(
      categories.map((category) => [category.id, category]),
    );
    return {
      settings,
      currentMonthExpenses: month._sum.amount ?? 0,
      currentWeekExpenses: week._sum.amount ?? 0,
      recentExpenses,
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
      activeProjects: activeProjects.map(({ tasks, ...project }) => ({
        ...project,
        progress: tasks.length
          ? Math.round(
              (tasks.filter((task) => task.status === 'done').length /
                tasks.length) *
                100,
            )
          : 0,
      })),
    };
  }
}
