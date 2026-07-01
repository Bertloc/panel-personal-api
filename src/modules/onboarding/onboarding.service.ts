import { Injectable } from '@nestjs/common';
import { DEFAULT_USER_ID } from '../../common';
import { PrismaService } from '../../prisma/prisma.service';
import { CompleteOnboardingDto } from './onboarding.dto';

@Injectable()
export class OnboardingService {
  constructor(private readonly prisma: PrismaService) {}

  async getStatus() {
    const profile = await this.prisma.profile.upsert({
      where: { userId: DEFAULT_USER_ID },
      create: { userId: DEFAULT_USER_ID, displayName: 'Personal Profile' },
      update: {},
    });
    const [settings, incomeSources] = await Promise.all([
      this.prisma.appSettings.findUnique({
        where: { userId: DEFAULT_USER_ID },
      }),
      this.prisma.incomeSource.findMany({
        where: { userId: DEFAULT_USER_ID, isActive: true },
        orderBy: { createdAt: 'asc' },
      }),
    ]);
    return {
      completed: profile.onboardingCompleted,
      profile,
      settings,
      incomeSources,
    };
  }

  complete(dto: CompleteOnboardingDto) {
    return this.prisma.$transaction(async (tx) => {
      const completedAt = new Date();
      const profile = await tx.profile.upsert({
        where: { userId: DEFAULT_USER_ID },
        create: {
          ...dto.profile,
          userId: DEFAULT_USER_ID,
          onboardingCompleted: true,
          onboardingCompletedAt: completedAt,
        },
        update: {
          ...dto.profile,
          onboardingCompleted: true,
          onboardingCompletedAt: completedAt,
        },
      });
      const settings = await tx.appSettings.upsert({
        where: { userId: DEFAULT_USER_ID },
        create: {
          userId: DEFAULT_USER_ID,
          currency: dto.profile.currency,
          incomeFrequency: dto.income.frequency,
          budgetMode: dto.settings.budgetMode,
          defaultFoodBudget: 0,
          dailyTransportEstimate: 0,
        },
        update: {
          currency: dto.profile.currency,
          incomeFrequency: dto.income.frequency,
          budgetMode: dto.settings.budgetMode,
        },
      });
      const currentIncome = await tx.incomeSource.findFirst({
        where: { userId: DEFAULT_USER_ID, isActive: true },
        orderBy: { createdAt: 'asc' },
      });
      const incomeData = {
        ...dto.income,
        nextPaymentDate: dto.income.nextPaymentDate
          ? new Date(dto.income.nextPaymentDate)
          : null,
        isActive: true,
      };
      if (currentIncome) {
        await tx.incomeSource.update({
          where: { id: currentIncome.id, userId: DEFAULT_USER_ID },
          data: incomeData,
        });
      } else {
        await tx.incomeSource.create({
          data: { ...incomeData, userId: DEFAULT_USER_ID },
        });
      }
      const incomeSources = await tx.incomeSource.findMany({
        where: { userId: DEFAULT_USER_ID, isActive: true },
        orderBy: { createdAt: 'asc' },
      });
      return { completed: true, profile, settings, incomeSources };
    });
  }
}
