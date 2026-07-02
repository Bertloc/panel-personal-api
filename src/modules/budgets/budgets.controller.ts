import { Body, Controller, Get, Param, Patch, Post } from '@nestjs/common';
import {
  CreateBudgetLimitDto,
  CreateBudgetPeriodDto,
  CreateCurrentBudgetDto,
  UpdateBudgetLimitDto,
  UpdateCurrentBudgetDto,
} from './budgets.dto';
import { BudgetsService } from './budgets.service';
import { CurrentUserId } from '../auth/auth.decorator';

@Controller('api/budgets')
export class BudgetsController {
  constructor(private readonly service: BudgetsService) {}
  @Get('current') getCurrent(@CurrentUserId() userId: string) {
    return this.service.getCurrent(userId);
  }
  @Post('current') createCurrent(
    @Body() dto: CreateCurrentBudgetDto,
    @CurrentUserId() userId: string,
  ) {
    return this.service.createCurrent(dto, userId);
  }
  @Patch('current') updateCurrent(
    @Body() dto: UpdateCurrentBudgetDto,
    @CurrentUserId() userId: string,
  ) {
    return this.service.updateCurrent(dto, userId);
  }
  @Get('periods') getPeriods(@CurrentUserId() userId: string) {
    return this.service.getPeriods(userId);
  }
  @Post('periods') createPeriod(
    @Body() dto: CreateBudgetPeriodDto,
    @CurrentUserId() userId: string,
  ) {
    return this.service.createPeriod(dto, userId);
  }
  @Get('periods/:id') getPeriod(
    @Param('id') id: string,
    @CurrentUserId() userId: string,
  ) {
    return this.service.getPeriod(id, userId);
  }
  @Post('limits') createLimit(
    @Body() dto: CreateBudgetLimitDto,
    @CurrentUserId() userId: string,
  ) {
    return this.service.createLimit(dto, userId);
  }
  @Patch('limits/:id') updateLimit(
    @Param('id') id: string,
    @Body() dto: UpdateBudgetLimitDto,
    @CurrentUserId() userId: string,
  ) {
    return this.service.updateLimit(id, dto, userId);
  }
}
