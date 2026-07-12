import { PrismaService } from '../../prisma/prisma.service';
import { RoutinesService } from '../routines/routines.service';
import { ProgressService } from './progress.service';

describe('ProgressService', () => {
  it('maps habits to routine and keeps enriched and legacy heatmap values', async () => {
    const prisma = {
      budgetPeriod: { findMany: jest.fn().mockResolvedValue([]) },
      expense: { findMany: jest.fn().mockResolvedValue([]) },
      incomeEvent: { findMany: jest.fn().mockResolvedValue([]) },
      debtPayment: { findMany: jest.fn().mockResolvedValue([]) },
      debt: { findMany: jest.fn().mockResolvedValue([]) },
      savingsMovement: { findMany: jest.fn().mockResolvedValue([]) },
      projectTask: { findMany: jest.fn().mockResolvedValue([]) },
    } as unknown as PrismaService;
    const routines = {
      history: jest.fn().mockResolvedValue({
        days: [
          {
            date: '2026-01-05',
            total: 1,
            done: 1,
            pending: 0,
            skipped: 0,
            missed: 0,
            completionPercent: 100,
          },
        ],
      }),
    } as unknown as RoutinesService;

    const result = await new ProgressService(prisma, routines).getHeatmap({
      filter: 'habits',
      year: 2026,
    });
    const dayIndex = result.items.findIndex(
      (item) => item.date === '2026-01-05',
    );

    expect(result.filter).toBe('routine');
    expect(result.items).toHaveLength(365);
    expect(result.items[dayIndex]).toMatchObject({ value: 100, level: 4 });
    expect(result.days[dayIndex]).toMatchObject({ value: 4, score: 100 });
  });

  it('redistributes the configured weights across real daily signals', async () => {
    const prisma = {
      budgetPeriod: {
        findMany: jest.fn().mockResolvedValue([
          {
            startDate: new Date('2026-07-01T00:00:00.000Z'),
            endDate: new Date('2026-07-10T00:00:00.000Z'),
            limits: [{ limitAmount: new Prisma.Decimal(1000) }],
          },
        ]),
      },
      expense: {
        findMany: jest.fn().mockResolvedValue([
          {
            amount: new Prisma.Decimal(50),
            expenseDate: new Date('2026-07-01T00:00:00.000Z'),
          },
        ]),
      },
      incomeEvent: { findMany: jest.fn().mockResolvedValue([]) },
      debtPayment: {
        findMany: jest.fn().mockResolvedValue([
          {
            amount: new Prisma.Decimal(100),
            paymentDate: new Date('2026-07-01T00:00:00.000Z'),
          },
        ]),
      },
      debt: { findMany: jest.fn().mockResolvedValue([]) },
      savingsMovement: {
        findMany: jest.fn().mockResolvedValue([
          {
            amount: new Prisma.Decimal(20),
            movementDate: new Date('2026-07-01T00:00:00.000Z'),
            movementType: 'deposit',
          },
        ]),
      },
      projectTask: { findMany: jest.fn().mockResolvedValue([]) },
    } as unknown as PrismaService;
    const routines = {
      history: jest.fn().mockResolvedValue({
        days: [
          {
            date: '2026-07-01',
            total: 2,
            done: 1,
            pending: 1,
            skipped: 0,
            missed: 0,
            completionPercent: 50,
          },
        ],
      }),
    } as unknown as RoutinesService;

    const result = await new ProgressService(prisma, routines).getDay(
      '2026-07-01',
    );

    expect(result.general).toBe(82.5);
    expect(result.money.score).toBe(100);
    expect(result.routine.score).toBe(50);
    expect(result.debt.score).toBe(100);
    expect(result.saving.score).toBe(100);
  });
});
import { Prisma } from '@prisma/client';
