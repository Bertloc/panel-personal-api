import { PrismaService } from '../../prisma/prisma.service';
import { RoutinesService } from '../routines/routines.service';
import { ProgressService } from './progress.service';

describe('ProgressService', () => {
  it.each([
    { total: 1, done: 1, completionPercent: 100, expectedPoint: 1 },
    { total: 5, done: 3, completionPercent: 60, expectedPoint: 1 },
    { total: 5, done: 2, completionPercent: 40, expectedPoint: 0 },
  ])(
    'uses scheduled routine completion $completionPercent% for the general score',
    async ({ total, done, completionPercent, expectedPoint }) => {
      const upsert = jest
        .fn()
        .mockImplementation(({ create }: { create: unknown }) => create);
      const prisma = {
        expense: {
          count: jest.fn().mockResolvedValue(0),
          aggregate: jest.fn().mockResolvedValue({ _sum: { amount: null } }),
        },
        habitLog: { count: jest.fn().mockResolvedValue(0) },
        savingsMovement: { count: jest.fn().mockResolvedValue(0) },
        debtPayment: { count: jest.fn().mockResolvedValue(0) },
        budgetPeriod: { findFirst: jest.fn().mockResolvedValue(null) },
        dailyProgress: { upsert },
      } as unknown as PrismaService;
      const routines = {
        getSummaryForDate: jest.fn().mockResolvedValue({
          total,
          done,
          pending: total - done,
          skipped: 0,
          missed: 0,
          completionPercent,
        }),
      } as unknown as RoutinesService;
      const date = new Date('2026-08-23T00:00:00.000Z');

      await new ProgressService(prisma, routines).recalculate(
        { date: '2026-08-23' },
        'user-id',
      );

      expect(routines.getSummaryForDate).toHaveBeenCalledWith(date, 'user-id');
      expect(upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          create: expect.objectContaining({
            habitsCompletionRate: completionPercent,
            score: expectedPoint,
          }),
        }),
      );
    },
  );
});
