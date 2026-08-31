import { Module } from '@nestjs/common';
import { MoneyController } from './money.controller';
import { MoneyService } from './money.service';
import { FinancialGuidanceService } from './financial-guidance.service';

@Module({
  controllers: [MoneyController],
  providers: [MoneyService, FinancialGuidanceService],
})
export class MoneyModule {}
