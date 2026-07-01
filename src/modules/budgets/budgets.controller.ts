import { Body, Controller, Get, Param, Patch, Post } from '@nestjs/common';
import {
  CreateBudgetLimitDto,
  CreateBudgetPeriodDto,
  CreateCurrentBudgetDto,
  UpdateBudgetLimitDto,
  UpdateCurrentBudgetDto,
} from './budgets.dto';
import { BudgetsService } from './budgets.service';

@Controller('api/budgets')
export class BudgetsController {
  constructor(private readonly service: BudgetsService) {}
  @Get('current') getCurrent() {
    return this.service.getCurrent();
  }
  @Post('current') createCurrent(@Body() dto: CreateCurrentBudgetDto) {
    return this.service.createCurrent(dto);
  }
  @Patch('current') updateCurrent(@Body() dto: UpdateCurrentBudgetDto) {
    return this.service.updateCurrent(dto);
  }
  @Get('periods') getPeriods() {
    return this.service.getPeriods();
  }
  @Post('periods') createPeriod(@Body() dto: CreateBudgetPeriodDto) {
    return this.service.createPeriod(dto);
  }
  @Get('periods/:id') getPeriod(@Param('id') id: string) {
    return this.service.getPeriod(id);
  }
  @Post('limits') createLimit(@Body() dto: CreateBudgetLimitDto) {
    return this.service.createLimit(dto);
  }
  @Patch('limits/:id') updateLimit(
    @Param('id') id: string,
    @Body() dto: UpdateBudgetLimitDto,
  ) {
    return this.service.updateLimit(id, dto);
  }
}
