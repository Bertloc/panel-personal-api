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
  CreateRecurringPaymentDto,
  RecurringPaymentFiltersDto,
  UpdateRecurringPaymentDto,
} from './recurring-payments.dto';
import { RecurringPaymentsService } from './recurring-payments.service';
import { CurrentUserId } from '../auth/auth.decorator';

@Controller('api/recurring-payments')
export class RecurringPaymentsController {
  constructor(private readonly service: RecurringPaymentsService) {}

  @Get() getAll(
    @Query() filters: RecurringPaymentFiltersDto,
    @CurrentUserId() userId: string,
  ) {
    return this.service.getAll(filters, userId);
  }

  @Post() create(
    @Body() dto: CreateRecurringPaymentDto,
    @CurrentUserId() userId: string,
  ) {
    return this.service.create(dto, userId);
  }

  @Patch(':id') update(
    @Param('id') id: string,
    @Body() dto: UpdateRecurringPaymentDto,
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
}
