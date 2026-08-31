import { Injectable } from '@nestjs/common';
import { startOfUtcDay } from '../../common';
import { PrismaService } from '../../prisma/prisma.service';
import { resolvePeriodIncome } from '../income/income-period.util';
import { monthlySavingsSuggestion } from '../savings/savings-calculations.util';

export type GuidanceMode =
  'adjusted' | 'flexible' | 'debt_aggressive' | 'saving_aggressive';

export interface GuidanceRecommendation {
  type:
    | 'warning'
    | 'budget'
    | 'obligation'
    | 'flexible'
    | 'debt'
    | 'saving'
    | 'setup';
  priority: 'primary' | 'secondary';
  reason: string;
  amount?: number;
  entityId?: string;
  entityName?: string;
  entityPriority?: string;
  percent?: number;
  interestRate?: number | null;
  shortfall?: number;
}

export interface GuidanceInput {
  mode: GuidanceMode;
  period: { startDate: Date; endDate: Date; remainingDays: number };
  income: number;
  incomeIsEstimated: boolean;
  expenses: number;
  budget: null | {
    total: number;
    used: number;
    remaining: number;
    categories: Array<{
      id: string;
      name: string;
      limit: number;
      used: number;
    }>;
  };
  obligations: number;
  debtMinimums: number;
  debts: Array<{
    id: string;
    name: string;
    currentAmount: number;
    priority: string;
    interestRate: number | null;
  }>;
  savings: Array<{
    id: string;
    name: string;
    currentAmount: number;
    targetAmount: number;
    targetDate: Date | null;
    priority: string;
    monthlySuggestedAmount: number | null;
  }>;
  budgetObligationOverlap: boolean;
}

@Injectable()
export class FinancialGuidanceService {
  constructor(private readonly prisma: PrismaService) {}

  async getGuidance(userId: string, date = new Date()) {
    const today = startOfUtcDay(date);
    const [
      settings,
      currentBudget,
      incomeSources,
      debts,
      savings,
      obligations,
    ] = await Promise.all([
      this.prisma.appSettings.findUnique({ where: { userId } }),
      this.prisma.budgetPeriod.findFirst({
        where: {
          userId,
          OR: [
            { status: 'active' },
            { startDate: { lte: today }, endDate: { gte: today } },
          ],
        },
        include: { limits: { include: { category: true } } },
        orderBy: [{ status: 'asc' }, { startDate: 'desc' }],
      }),
      this.prisma.incomeSource.findMany({
        where: { userId, isActive: true },
      }),
      this.prisma.debt.findMany({
        where: { userId, status: 'active', currentAmount: { gt: 0 } },
      }),
      this.prisma.savingsGoal.findMany({
        where: { userId, status: 'active' },
      }),
      this.prisma.recurringObligation.findMany({
        where: { userId, isActive: true, isRequired: true },
      }),
    ]);
    const periodStart =
      currentBudget?.startDate ??
      new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), 1));
    const periodEnd =
      currentBudget?.endDate ??
      new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth() + 1, 0));
    const [incomeEvents, expenseUsage] = await Promise.all([
      this.prisma.incomeEvent.findMany({
        where: { userId, incomeDate: { gte: periodStart, lte: periodEnd } },
        select: { amount: true },
      }),
      this.prisma.expense.groupBy({
        by: ['categoryId'],
        where: { userId, expenseDate: { gte: periodStart, lte: periodEnd } },
        _sum: { amount: true },
      }),
    ]);
    const income = resolvePeriodIncome(
      incomeEvents,
      incomeSources,
      periodStart,
      periodEnd,
    );
    const usedByCategory = new Map(
      expenseUsage.map((item) => [item.categoryId, number(item._sum.amount)]),
    );
    const expenses = expenseUsage.reduce(
      (sum, item) => sum + number(item._sum.amount),
      0,
    );
    const categories =
      currentBudget?.limits.map((limit) => ({
        id: limit.categoryId,
        name: limit.category.name,
        limit: number(limit.limitAmount),
        used: usedByCategory.get(limit.categoryId) ?? 0,
      })) ?? [];
    const budgetUsed = categories.reduce((sum, item) => sum + item.used, 0);
    const budgetTotal = categories.reduce((sum, item) => sum + item.limit, 0);
    const obligationTotal = obligations.reduce(
      (sum, obligation) =>
        sum +
        (isObligationDue(obligation, today, periodEnd)
          ? number(obligation.amount)
          : 0),
      0,
    );
    const debtMinimums = debts.reduce(
      (sum, debt) =>
        sum +
        (isMonthlyDayDue(debt.paymentDay, today, periodEnd)
          ? Math.min(number(debt.minimumPayment), number(debt.currentAmount))
          : 0),
      0,
    );
    const remainingDays = Math.max(
      1,
      Math.floor((periodEnd.getTime() - today.getTime()) / 86_400_000) + 1,
    );
    return buildFinancialGuidance({
      mode: (settings?.budgetMode ?? 'adjusted') as GuidanceMode,
      period: { startDate: periodStart, endDate: periodEnd, remainingDays },
      income: income.amount,
      incomeIsEstimated: income.isEstimated,
      expenses,
      budget: currentBudget
        ? {
            total: budgetTotal,
            used: budgetUsed,
            remaining: budgetTotal - budgetUsed,
            categories,
          }
        : null,
      obligations: obligationTotal,
      debtMinimums,
      debts: debts.map((debt) => ({
        id: debt.id,
        name: debt.name,
        currentAmount: number(debt.currentAmount),
        priority: debt.priority,
        interestRate:
          debt.interestRate === null ? null : number(debt.interestRate),
      })),
      savings: savings.map((goal) => ({
        id: goal.id,
        name: goal.name,
        currentAmount: number(goal.currentAmount),
        targetAmount: number(goal.targetAmount),
        targetDate: goal.targetDate,
        priority: goal.priority,
        monthlySuggestedAmount: monthlySavingsSuggestion(
          goal.currentAmount,
          goal.targetAmount,
          goal.targetDate,
          today,
        ),
      })),
      budgetObligationOverlap: obligations.some(
        ({ categoryId }) =>
          categoryId && categories.some(({ id }) => id === categoryId),
      ),
    });
  }
}

export function buildFinancialGuidance(input: GuidanceInput) {
  const available = money(
    input.income - input.expenses - input.obligations - input.debtMinimums,
  );
  const dailySafeAmount = input.budget
    ? money(Math.max(0, input.budget.remaining) / input.period.remainingDays)
    : null;
  const recommendations = recommendationsFor(input, available, dailySafeAmount);
  const warnings: string[] = [];
  if (input.incomeIsEstimated) warnings.push('income_estimated');
  if (input.debtMinimums > 0) warnings.push('debt_payment_cycle_unconfirmed');
  if (input.budgetObligationOverlap)
    warnings.push('budget_obligations_kept_separate');
  return {
    mode: input.mode,
    period: {
      startDate: dateOnly(input.period.startDate),
      endDate: dateOnly(input.period.endDate),
      remainingDays: input.period.remainingDays,
    },
    income: money(input.income),
    incomeIsEstimated: input.incomeIsEstimated,
    expenses: money(input.expenses),
    budget: input.budget && {
      total: money(input.budget.total),
      used: money(input.budget.used),
      remaining: money(input.budget.remaining),
    },
    obligations: money(input.obligations),
    debtMinimums: money(input.debtMinimums),
    available,
    dailySafeAmount,
    calculation: {
      formula: 'income - expenses - upcoming_obligations - debt_minimums',
      budgetLimitsSubtracted: false,
    },
    recommendations,
    warnings,
  };
}

function recommendationsFor(
  input: GuidanceInput,
  available: number,
  dailySafeAmount: number | null,
): GuidanceRecommendation[] {
  if (available < 0)
    return [
      {
        type: 'warning',
        priority: 'primary',
        reason: 'commitments_exceed_income',
        amount: Math.abs(available),
      },
    ];
  if (input.mode === 'adjusted') {
    if (!input.budget)
      return [{ type: 'setup', priority: 'primary', reason: 'no_budget' }];
    const category = [...input.budget.categories]
      .filter(({ limit }) => limit > 0)
      .sort((a, b) => b.used / b.limit - a.used / a.limit)
      .find(({ used, limit }) => used >= limit * 0.8);
    if (category)
      return [
        {
          type: 'budget',
          priority: 'primary',
          reason:
            category.used > category.limit
              ? 'category_exceeded'
              : 'category_near_limit',
          entityId: category.id,
          entityName: category.name,
          percent: Math.round((category.used / category.limit) * 100),
        },
      ];
    if (input.obligations > 0)
      return [
        {
          type: 'obligation',
          priority: 'primary',
          reason: 'upcoming_obligations',
          amount: money(input.obligations),
        },
      ];
    return [
      {
        type: 'budget',
        priority: 'primary',
        reason: 'daily_budget',
        amount: dailySafeAmount ?? 0,
      },
    ];
  }
  if (input.mode === 'flexible') {
    const result: GuidanceRecommendation[] = [
      {
        type: 'flexible',
        priority: 'primary',
        reason: 'unassigned_margin',
        amount: Math.max(0, available),
      },
    ];
    if (input.debts.length)
      result.push({
        type: 'debt',
        priority: 'secondary',
        reason: 'available_option',
      });
    if (input.savings.length)
      result.push({
        type: 'saving',
        priority: 'secondary',
        reason: 'available_option',
      });
    return result;
  }
  if (input.mode === 'debt_aggressive') {
    const debt = [...input.debts]
      .filter(({ currentAmount }) => currentAmount > 0)
      .sort(
        (a, b) =>
          priority(b.priority) - priority(a.priority) ||
          (b.interestRate ?? -1) - (a.interestRate ?? -1),
      )[0];
    if (!debt)
      return [{ type: 'setup', priority: 'primary', reason: 'no_active_debt' }];
    return [
      {
        type: 'debt',
        priority: 'primary',
        reason: available > 0 ? 'priority_debt' : 'no_extra_margin',
        amount: money(Math.min(Math.max(0, available), debt.currentAmount)),
        entityId: debt.id,
        entityName: debt.name,
        entityPriority: debt.priority,
        interestRate: debt.interestRate,
      },
    ];
  }
  const goal = [...input.savings]
    .filter(({ currentAmount, targetAmount }) => currentAmount < targetAmount)
    .sort(
      (a, b) =>
        priority(b.priority) - priority(a.priority) ||
        Number(b.monthlySuggestedAmount !== null) -
          Number(a.monthlySuggestedAmount !== null) ||
        (b.monthlySuggestedAmount ?? -1) - (a.monthlySuggestedAmount ?? -1) ||
        (a.targetDate?.getTime() ?? Number.MAX_SAFE_INTEGER) -
          (b.targetDate?.getTime() ?? Number.MAX_SAFE_INTEGER),
    )[0];
  if (!goal)
    return [{ type: 'setup', priority: 'primary', reason: 'no_active_goal' }];
  if (goal.monthlySuggestedAmount === null)
    return [
      {
        type: 'saving',
        priority: 'primary',
        reason: 'target_date_missing',
        entityId: goal.id,
        entityName: goal.name,
      },
    ];
  return [
    {
      type: 'saving',
      priority: 'primary',
      reason: 'target_date',
      amount: money(goal.monthlySuggestedAmount),
      shortfall: money(Math.max(0, goal.monthlySuggestedAmount - available)),
      entityId: goal.id,
      entityName: goal.name,
      entityPriority: goal.priority,
    },
  ];
}

function isObligationDue(
  obligation: {
    frequency: string;
    dueDay: number | null;
    nextDueDate: Date | null;
  },
  start: Date,
  end: Date,
) {
  if (obligation.nextDueDate)
    return obligation.nextDueDate >= start && obligation.nextDueDate <= end;
  return obligation.frequency === 'monthly' && obligation.dueDay
    ? isMonthlyDayDue(obligation.dueDay, start, end)
    : false;
}

function isMonthlyDayDue(day: number, start: Date, end: Date) {
  const candidate = new Date(
    Date.UTC(start.getUTCFullYear(), start.getUTCMonth(), 1),
  );
  const setDay = () => {
    const last = new Date(
      Date.UTC(candidate.getUTCFullYear(), candidate.getUTCMonth() + 1, 0),
    ).getUTCDate();
    candidate.setUTCDate(Math.min(day, last));
  };
  setDay();
  if (candidate < start) {
    candidate.setUTCMonth(candidate.getUTCMonth() + 1, 1);
    setDay();
  }
  return candidate <= end;
}

function priority(value: string) {
  return { urgent: 4, high: 3, medium: 2, low: 1 }[value] ?? 0;
}

function number(value: unknown) {
  const result = Number(value);
  return Number.isFinite(result) ? result : 0;
}

function money(value: number) {
  return Math.round((Number.isFinite(value) ? value : 0) * 100) / 100;
}

function dateOnly(value: Date) {
  return value.toISOString().slice(0, 10);
}
