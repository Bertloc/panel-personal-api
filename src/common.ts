export const DEFAULT_USER_ID = '00000000-0000-0000-0000-000000000001';
export const INCOME_FREQUENCIES = [
  'daily',
  'weekly',
  'biweekly',
  'monthly',
  'irregular',
] as const;
export const BUDGET_MODES = [
  'adjusted',
  'flexible',
  'debt_aggressive',
  'saving_aggressive',
] as const;

export const startOfUtcDay = (date = new Date()) =>
  new Date(
    Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()),
  );

export const nextUtcDay = (date: Date) =>
  new Date(
    Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate() + 1),
  );
