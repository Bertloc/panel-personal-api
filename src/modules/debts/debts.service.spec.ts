import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { DebtsService } from './debts.service';

describe('DebtsService', () => {
  it('restores the debt balance when deleting a payment', async () => {
    let updatedBalance: Prisma.Decimal | undefined;
    const tx = {
      debtPayment: { delete: jest.fn().mockResolvedValue({}) },
      debt: {
        update: jest.fn((args: { data: { currentAmount: Prisma.Decimal } }) => {
          updatedBalance = args.data.currentAmount;
          return Promise.resolve({});
        }),
      },
    };
    const transaction = <T>(callback: (client: typeof tx) => Promise<T>) =>
      callback(tx);
    const prisma = {
      debtPayment: {
        findFirst: jest.fn().mockResolvedValue({
          id: 'payment-id',
          debtId: 'debt-id',
          amount: new Prisma.Decimal(20),
          debt: {
            initialAmount: new Prisma.Decimal(100),
            currentAmount: new Prisma.Decimal(80),
            status: 'active',
          },
        }),
      },
      $transaction: transaction,
    } as unknown as PrismaService;

    await new DebtsService(prisma).removePayment('payment-id', 'user-id');

    expect(updatedBalance?.toNumber()).toBe(100);
  });
});
