import { Module } from '@nestjs/common';
import { IncomeController, IncomeEventsController } from './income.controller';
import { IncomeService } from './income.service';

@Module({
  controllers: [IncomeController, IncomeEventsController],
  providers: [IncomeService],
})
export class IncomeModule {}
