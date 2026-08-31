import {
  expectedIncomeInRange,
  resolvePeriodIncome,
} from './income-period.util';

const start = new Date('2026-08-01T00:00:00.000Z');
const end = new Date('2026-08-31T00:00:00.000Z');

describe('period income', () => {
  it('projects biweekly, monthly, and weekly sources from their configured date', () => {
    expect(
      expectedIncomeInRange(
        [
          {
            amount: 5000,
            frequency: 'biweekly',
            nextPaymentDate: '2026-08-05',
          },
        ],
        start,
        end,
      ),
    ).toBe(10000);
    expect(
      expectedIncomeInRange(
        [
          {
            amount: 10000,
            frequency: 'monthly',
            nextPaymentDate: '2026-08-15',
          },
        ],
        start,
        end,
      ),
    ).toBe(10000);
    expect(
      expectedIncomeInRange(
        [{ amount: 1000, frequency: 'weekly', nextPaymentDate: '2026-08-01' }],
        start,
        end,
      ),
    ).toBe(5000);
  });

  it('uses actual events instead of estimates and never projects irregular income', () => {
    expect(
      resolvePeriodIncome(
        [{ amount: 3200 }, { amount: '800' }],
        [{ amount: 10000, frequency: 'monthly' }],
        start,
        end,
      ),
    ).toEqual({ amount: 4000, isEstimated: false });
    expect(
      resolvePeriodIncome(
        [],
        [{ amount: 9000, frequency: 'irregular' }],
        start,
        end,
      ),
    ).toEqual({ amount: 0, isEstimated: true });
  });

  it('uses UTC calendar dates and clamps monthly day 31 in shorter months', () => {
    expect(
      expectedIncomeInRange(
        [{ amount: 100, frequency: 'monthly', nextPaymentDate: '2026-01-31' }],
        new Date('2026-02-01T00:00:00-06:00'),
        new Date('2026-02-28T23:59:59-06:00'),
      ),
    ).toBe(100);
  });
});
