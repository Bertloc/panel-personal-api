import { PrismaService } from '../../prisma/prisma.service';
import { BudgetsService } from './budgets.service';

describe('BudgetsService', () => {
  it('calculates warning usage and summary for the current budget', async () => {
    const prisma = {
      budgetPeriod: {
        findFirst: jest.fn().mockResolvedValue({
          id: 'period-id',
          userId: 'user-id',
          name: 'Current',
          periodType: 'monthly',
          startDate: new Date('2026-07-01'),
          endDate: new Date('2026-07-31'),
          expectedIncome: null,
          status: 'active',
          createdAt: new Date(),
          updatedAt: new Date(),
        }),
      },
      budgetLimit: {
        findMany: jest.fn().mockResolvedValue([
          {
            id: 'limit-id',
            categoryId: 'category-id',
            limitAmount: 100,
            category: { name: 'Comida' },
          },
        ]),
      },
      expense: {
        groupBy: jest
          .fn()
          .mockResolvedValue([
            { categoryId: 'category-id', _sum: { amount: 80 } },
          ]),
      },
    } as unknown as PrismaService;

    const result = await new BudgetsService(prisma).getCurrent();

    expect(result.limits[0]).toMatchObject({
      amount: 100,
      used: 80,
      remaining: 20,
      status: 'warning',
    });
    expect(result.summary).toEqual({
      totalLimit: 100,
      totalUsed: 80,
      totalRemaining: 20,
    });
  });
});
