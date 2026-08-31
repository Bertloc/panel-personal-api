export function monthlySavingsSuggestion(
  currentAmount: unknown,
  targetAmount: unknown,
  targetDate: Date | null | undefined,
  today = new Date(),
): number | null {
  if (!targetDate) return null;
  const remaining = Math.max(0, Number(targetAmount) - Number(currentAmount));
  const months = Math.max(
    1,
    (targetDate.getUTCFullYear() - today.getUTCFullYear()) * 12 +
      targetDate.getUTCMonth() -
      today.getUTCMonth() +
      Number(targetDate.getUTCDate() > today.getUTCDate()),
  );
  return remaining / months;
}
