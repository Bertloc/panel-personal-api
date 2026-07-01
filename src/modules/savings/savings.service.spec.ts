import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { SavingsService } from './savings.service';

describe('SavingsService', () => {
  it('restores the goal balance when deleting a deposit', async () => {
    let updatedBalance: Prisma.Decimal | undefined;
    const tx = {
      savingsMovement: { delete: jest.fn().mockResolvedValue({}) },
      savingsGoal: {
        update: jest.fn((args: { data: { currentAmount: Prisma.Decimal } }) => {
          updatedBalance = args.data.currentAmount;
          return Promise.resolve({});
        }),
      },
    };
    const transaction = <T>(callback: (client: typeof tx) => Promise<T>) =>
      callback(tx);
    const prisma = {
      savingsMovement: {
        findFirst: jest.fn().mockResolvedValue({
          id: 'movement-id',
          savingsGoalId: 'goal-id',
          amount: new Prisma.Decimal(30),
          movementType: 'deposit',
          savingsGoal: {
            currentAmount: new Prisma.Decimal(50),
            targetAmount: new Prisma.Decimal(100),
            status: 'active',
          },
        }),
      },
      $transaction: transaction,
    } as unknown as PrismaService;

    await new SavingsService(prisma).removeMovement('movement-id');

    expect(updatedBalance?.toNumber()).toBe(20);
  });
});
