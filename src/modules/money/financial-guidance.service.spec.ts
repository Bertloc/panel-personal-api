import {
  buildFinancialGuidance,
  GuidanceInput,
} from './financial-guidance.service';

const input = (overrides: Partial<GuidanceInput> = {}): GuidanceInput => ({
  mode: 'adjusted',
  period: {
    startDate: new Date('2026-08-01T00:00:00Z'),
    endDate: new Date('2026-08-31T00:00:00Z'),
    remainingDays: 12,
  },
  income: 10000,
  incomeIsEstimated: false,
  expenses: 2000,
  budget: {
    total: 6000,
    used: 2400,
    remaining: 3600,
    categories: [{ id: 'food', name: 'Comida', limit: 1000, used: 860 }],
  },
  obligations: 1000,
  debtMinimums: 500,
  debts: [],
  savings: [],
  budgetObligationOverlap: false,
  ...overrides,
});

describe('financial guidance', () => {
  it('prioritizes an at-risk category in adjusted mode', () => {
    const result = buildFinancialGuidance(input());
    expect(result.available).toBe(6500);
    expect(result.dailySafeAmount).toBe(300);
    expect(result.recommendations[0]).toMatchObject({
      type: 'budget',
      reason: 'category_near_limit',
      entityName: 'Comida',
      percent: 86,
    });
  });

  it('shows unassigned margin and optional paths in flexible mode', () => {
    const result = buildFinancialGuidance(
      input({
        mode: 'flexible',
        debts: [
          {
            id: 'd',
            name: 'Tarjeta',
            currentAmount: 4000,
            priority: 'high',
            interestRate: null,
          },
        ],
        savings: [
          {
            id: 's',
            name: 'Laptop',
            currentAmount: 0,
            targetAmount: 10000,
            targetDate: null,
            priority: 'medium',
            monthlySuggestedAmount: null,
          },
        ],
      }),
    );
    expect(result.recommendations.map(({ type }) => type)).toEqual([
      'flexible',
      'debt',
      'saving',
    ]);
    expect(result.recommendations[0].amount).toBe(6500);
  });

  it('orders debts by priority and then APR without inventing interest calculations', () => {
    const debts: GuidanceInput['debts'] = [
      {
        id: 'low',
        name: 'Sin APR',
        currentAmount: 9000,
        priority: 'medium',
        interestRate: null,
      },
      {
        id: 'apr-low',
        name: 'APR bajo',
        currentAmount: 8000,
        priority: 'high',
        interestRate: 12,
      },
      {
        id: 'apr-high',
        name: 'APR alto',
        currentAmount: 3000,
        priority: 'high',
        interestRate: 35,
      },
    ];
    const result = buildFinancialGuidance(
      input({ mode: 'debt_aggressive', debts }),
    );
    expect(result.recommendations[0]).toMatchObject({
      entityId: 'apr-high',
      amount: 3000,
      interestRate: 35,
    });
    expect(result.calculation.formula).not.toContain('interest');
  });

  it('handles debt mode without active debt', () => {
    expect(
      buildFinancialGuidance(input({ mode: 'debt_aggressive' }))
        .recommendations[0],
    ).toMatchObject({ type: 'setup', reason: 'no_active_debt' });
  });

  it('uses the backend monthly saving suggestion and reports a shortfall', () => {
    const result = buildFinancialGuidance(
      input({
        mode: 'saving_aggressive',
        income: 3500,
        expenses: 1000,
        obligations: 500,
        debtMinimums: 500,
        savings: [
          {
            id: 'goal',
            name: 'Laptop',
            currentAmount: 2000,
            targetAmount: 10000,
            targetDate: new Date('2026-12-15'),
            priority: 'high',
            monthlySuggestedAmount: 2800,
          },
        ],
      }),
    );
    expect(result.recommendations[0]).toMatchObject({
      type: 'saving',
      reason: 'target_date',
      amount: 2800,
      shortfall: 1300,
    });
  });

  it('asks for a target date and handles missing savings goals', () => {
    const withoutDate = buildFinancialGuidance(
      input({
        mode: 'saving_aggressive',
        savings: [
          {
            id: 'goal',
            name: 'Laptop',
            currentAmount: 0,
            targetAmount: 10000,
            targetDate: null,
            priority: 'high',
            monthlySuggestedAmount: null,
          },
        ],
      }),
    );
    expect(withoutDate.recommendations[0].reason).toBe('target_date_missing');
    expect(
      buildFinancialGuidance(input({ mode: 'saving_aggressive' }))
        .recommendations[0].reason,
    ).toBe('no_active_goal');
  });

  it('does not recommend more contributions for an achieved goal', () => {
    const result = buildFinancialGuidance(
      input({
        mode: 'saving_aggressive',
        savings: [
          {
            id: 'done',
            name: 'Fondo',
            currentAmount: 5000,
            targetAmount: 5000,
            targetDate: new Date('2026-12-01'),
            priority: 'urgent',
            monthlySuggestedAmount: 0,
          },
        ],
      }),
    );
    expect(result.recommendations[0]).toMatchObject({
      type: 'setup',
      reason: 'no_active_goal',
    });
  });

  it('does not invent a daily budget without an active budget', () => {
    const result = buildFinancialGuidance(input({ budget: null }));
    expect(result.dailySafeAmount).toBeNull();
    expect(result.recommendations[0]).toMatchObject({
      type: 'setup',
      reason: 'no_budget',
    });
  });

  it('never recommends extra allocations when commitments exceed income', () => {
    const result = buildFinancialGuidance(
      input({
        mode: 'saving_aggressive',
        income: 1000,
        expenses: 900,
        obligations: 800,
        debtMinimums: 200,
      }),
    );
    expect(result.available).toBe(-900);
    expect(result.recommendations).toEqual([
      {
        type: 'warning',
        priority: 'primary',
        reason: 'commitments_exceed_income',
        amount: 900,
      },
    ]);
  });

  it('keeps budget remaining separate instead of subtracting it twice', () => {
    const result = buildFinancialGuidance(
      input({ budgetObligationOverlap: true }),
    );
    expect(result.available).toBe(10000 - 2000 - 1000 - 500);
    expect(result.calculation.budgetLimitsSubtracted).toBe(false);
    expect(result.warnings).toContain('budget_obligations_kept_separate');
    expect(result.warnings).toContain('debt_payment_cycle_unconfirmed');
  });
});
