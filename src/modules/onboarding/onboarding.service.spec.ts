import { PrismaService } from '../../prisma/prisma.service';
import { OnboardingService } from './onboarding.service';

describe('OnboardingService', () => {
  it('reuses the primary income source when onboarding is repeated', async () => {
    let incomeSource: { id: string; name: string } | undefined;
    const tx = {
      profile: {
        upsert: jest.fn().mockResolvedValue({ onboardingCompleted: true }),
      },
      appSettings: { upsert: jest.fn().mockResolvedValue({}) },
      incomeSource: {
        findFirst: jest.fn(() => Promise.resolve(incomeSource)),
        create: jest.fn(() => {
          incomeSource = { id: 'income-id', name: 'Ingreso principal' };
          return Promise.resolve(incomeSource);
        }),
        update: jest.fn(() => {
          incomeSource = { id: 'income-id', name: 'Ingreso principal' };
          return Promise.resolve(incomeSource);
        }),
        findMany: jest.fn(() => Promise.resolve([incomeSource])),
      },
    };
    const prisma = {
      $transaction: jest.fn(
        (callback: (client: typeof tx) => Promise<unknown>) => callback(tx),
      ),
    } as unknown as PrismaService;
    const service = new OnboardingService(prisma);
    const dto = {
      profile: { displayName: 'Humberto', currency: 'MXN' },
      income: {
        name: 'Ingreso principal',
        amount: 4730,
        frequency: 'biweekly',
      },
      settings: { budgetMode: 'adjusted' },
    };

    await service.complete(dto, 'user-id');
    await service.complete(dto, 'user-id');

    expect(tx.incomeSource.create).toHaveBeenCalledTimes(1);
    expect(tx.incomeSource.update).toHaveBeenCalledTimes(1);
  });
});
