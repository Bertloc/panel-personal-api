import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import {
  CreateDebtDto,
  CreateDebtPaymentDto,
  DebtFiltersDto,
  UpdateDebtDto,
  UpdateDebtPaymentDto,
} from './debts.dto';
import { DebtsService } from './debts.service';
import { CurrentUserId } from '../auth/auth.decorator';
@Controller('api/debts')
export class DebtsController {
  constructor(private readonly service: DebtsService) {}
  @Get() getAll(
    @Query() filters: DebtFiltersDto,
    @CurrentUserId() userId: string,
  ) {
    return this.service.getAll(filters, userId);
  }
  @Post() create(@Body() dto: CreateDebtDto, @CurrentUserId() userId: string) {
    return this.service.create(dto, userId);
  }
  @Get(':id') get(@Param('id') id: string, @CurrentUserId() userId: string) {
    return this.service.get(id, userId);
  }
  @Patch(':id') update(
    @Param('id') id: string,
    @Body() dto: UpdateDebtDto,
    @CurrentUserId() userId: string,
  ) {
    return this.service.update(id, dto, userId);
  }
  @Delete(':id') remove(
    @Param('id') id: string,
    @CurrentUserId() userId: string,
  ) {
    return this.service.remove(id, userId);
  }
  @Post(':id/payments') addPayment(
    @Param('id') id: string,
    @Body() dto: CreateDebtPaymentDto,
    @CurrentUserId() userId: string,
  ) {
    return this.service.addPayment(id, dto, userId);
  }
  @Get(':id/payments') getPayments(
    @Param('id') id: string,
    @CurrentUserId() userId: string,
  ) {
    return this.service.getPayments(id, userId);
  }
  @Patch('payments/:paymentId') updatePayment(
    @Param('paymentId') paymentId: string,
    @Body() dto: UpdateDebtPaymentDto,
    @CurrentUserId() userId: string,
  ) {
    return this.service.updatePayment(paymentId, dto, userId);
  }
  @Delete('payments/:paymentId') removePayment(
    @Param('paymentId') paymentId: string,
    @CurrentUserId() userId: string,
  ) {
    return this.service.removePayment(paymentId, userId);
  }
  @Get(':id/projection') projection(
    @Param('id') id: string,
    @CurrentUserId() userId: string,
  ) {
    return this.service.projection(id, userId);
  }
}
