import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CompleteOnboardingDto } from './onboarding.dto';

@Injectable()
export class OnboardingService {
  constructor(private readonly prisma: PrismaService) {}

  async getStatus(userId: string) {
    const profile = await this.prisma.profile.upsert({
      where: { userId },
      create: { userId, displayName: 'Personal Profile' },
      update: {},
    });
    const [settings, incomeSources] = await Promise.all([
      this.prisma.appSettings.findUnique({
        where: { userId },
      }),
      this.prisma.incomeSource.findMany({
        where: { userId, isActive: true },
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

  complete(dto: CompleteOnboardingDto, userId: string) {
    return this.prisma.$transaction(async (tx) => {
      const completedAt = new Date();
      const profile = await tx.profile.upsert({
        where: { userId },
        create: {
          ...dto.profile,
          userId,
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
        where: { userId },
        create: {
          userId,
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
        where: { userId, isActive: true },
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
          where: { id: currentIncome.id, userId },
          data: incomeData,
        });
      } else {
        await tx.incomeSource.create({
          data: { ...incomeData, userId },
        });
      }
      const incomeSources = await tx.incomeSource.findMany({
        where: { userId, isActive: true },
        orderBy: { createdAt: 'asc' },
      });
      return { completed: true, profile, settings, incomeSources };
    });
  }
}
