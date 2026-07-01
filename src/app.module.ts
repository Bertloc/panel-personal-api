import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaModule } from './prisma/prisma.module';
import { MoneyModule } from './modules/money/money.module';
import { SettingsModule } from './modules/settings/settings.module';
import { BudgetsModule } from './modules/budgets/budgets.module';
import { DebtsModule } from './modules/debts/debts.module';
import { SavingsModule } from './modules/savings/savings.module';
import { HabitsModule } from './modules/habits/habits.module';
import { ProgressModule } from './modules/progress/progress.module';
import { ProjectsModule } from './modules/projects/projects.module';
import { DashboardModule } from './modules/dashboard/dashboard.module';
import { IncomeModule } from './modules/income/income.module';
import { OnboardingModule } from './modules/onboarding/onboarding.module';
import { ProfilesModule } from './modules/profiles/profiles.module';
import { RecurringPaymentsModule } from './modules/recurring-payments/recurring-payments.module';
import { RoutinesModule } from './modules/routines/routines.module';

@Module({
  imports: [
    PrismaModule,
    MoneyModule,
    SettingsModule,
    BudgetsModule,
    DebtsModule,
    SavingsModule,
    HabitsModule,
    ProgressModule,
    ProjectsModule,
    DashboardModule,
    ProfilesModule,
    IncomeModule,
    OnboardingModule,
    RecurringPaymentsModule,
    RoutinesModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
