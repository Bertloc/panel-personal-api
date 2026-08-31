import { monthlySavingsSuggestion } from './savings-calculations.util';

describe('monthly savings suggestion', () => {
  it('calculates the remaining amount over the months through the target date', () => {
    expect(
      monthlySavingsSuggestion(
        2000,
        10000,
        new Date('2026-12-15T00:00:00Z'),
        new Date('2026-08-01T00:00:00Z'),
      ),
    ).toBe(1600);
  });

  it('does not invent a monthly amount without a target date', () => {
    expect(monthlySavingsSuggestion(2000, 10000, null)).toBeNull();
  });
});
