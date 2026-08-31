export interface IncomeSourceSchedule {
  amount: unknown;
  frequency: string;
  nextPaymentDate?: Date | string | null;
  createdAt?: Date | string | null;
}

export interface IncomeEventAmount {
  amount: unknown;
}

export interface PeriodIncome {
  amount: number;
  isEstimated: boolean;
}

const DAY_MS = 86_400_000;

export function resolvePeriodIncome(
  events: IncomeEventAmount[],
  sources: IncomeSourceSchedule[],
  startDate: Date,
  endDate: Date,
): PeriodIncome {
  if (events.length)
    return {
      amount: events.reduce((sum, event) => sum + amount(event.amount), 0),
      isEstimated: false,
    };
  return {
    amount: expectedIncomeInRange(sources, startDate, endDate),
    isEstimated: true,
  };
}

export function expectedIncomeInRange(
  sources: IncomeSourceSchedule[],
  startDate: Date,
  endDate: Date,
): number {
  const start = utcDate(startDate);
  const end = utcDate(endDate);
  if (start > end) return 0;
  return sources.reduce(
    (total, source) =>
      total + amount(source.amount) * occurrencesInRange(source, start, end),
    0,
  );
}

function occurrencesInRange(
  source: IncomeSourceSchedule,
  start: Date,
  end: Date,
): number {
  if (source.frequency === 'irregular') return 0;
  const created = source.createdAt ? utcDate(source.createdAt) : start;
  const effectiveStart = created > start ? created : start;
  if (effectiveStart > end) return 0;
  const anchor = source.nextPaymentDate
    ? utcDate(source.nextPaymentDate)
    : null;
  if (anchor) {
    if (source.frequency === 'monthly')
      return monthlyOccurrences(anchor, effectiveStart, end);
    const step = { daily: 1, weekly: 7, biweekly: 14 }[source.frequency];
    if (!step) return 0;
    const first = new Date(anchor);
    if (first < effectiveStart)
      first.setUTCDate(
        first.getUTCDate() +
          Math.ceil(
            (effectiveStart.getTime() - first.getTime()) / DAY_MS / step,
          ) *
            step,
      );
    return first > end
      ? 0
      : Math.floor((end.getTime() - first.getTime()) / DAY_MS / step) + 1;
  }
  const days =
    Math.floor((end.getTime() - effectiveStart.getTime()) / DAY_MS) + 1;
  if (source.frequency === 'daily') return days;
  if (source.frequency === 'weekly') return Math.max(1, Math.floor(days / 7));
  if (source.frequency === 'biweekly')
    return Math.max(1, Math.floor(days / 14));
  if (source.frequency === 'monthly')
    return (
      (end.getUTCFullYear() - effectiveStart.getUTCFullYear()) * 12 +
      end.getUTCMonth() -
      effectiveStart.getUTCMonth() +
      1
    );
  return 0;
}

function monthlyOccurrences(anchor: Date, start: Date, end: Date): number {
  if (anchor > end) return 0;
  let count = 0;
  const cursor = new Date(
    Date.UTC(start.getUTCFullYear(), start.getUTCMonth(), 1),
  );
  while (cursor <= end) {
    const lastDay = new Date(
      Date.UTC(cursor.getUTCFullYear(), cursor.getUTCMonth() + 1, 0),
    ).getUTCDate();
    const occurrence = new Date(
      Date.UTC(
        cursor.getUTCFullYear(),
        cursor.getUTCMonth(),
        Math.min(anchor.getUTCDate(), lastDay),
      ),
    );
    if (occurrence >= anchor && occurrence >= start && occurrence <= end)
      count++;
    cursor.setUTCMonth(cursor.getUTCMonth() + 1);
  }
  return count;
}

function utcDate(value: Date | string): Date {
  const iso = value instanceof Date ? value.toISOString() : value;
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso);
  if (!match) return new Date(Number.NaN);
  return new Date(
    Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3])),
  );
}

function amount(value: unknown): number {
  const number = Number(value);
  return Number.isFinite(number) ? number : 0;
}
