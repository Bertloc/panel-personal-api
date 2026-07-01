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

@Controller('api/recurring-payments')
export class RecurringPaymentsController {
  constructor(private readonly service: RecurringPaymentsService) {}

  @Get() getAll(@Query() filters: RecurringPaymentFiltersDto) {
    return this.service.getAll(filters);
  }

  @Post() create(@Body() dto: CreateRecurringPaymentDto) {
    return this.service.create(dto);
  }

  @Patch(':id') update(
    @Param('id') id: string,
    @Body() dto: UpdateRecurringPaymentDto,
  ) {
    return this.service.update(id, dto);
  }

  @Delete(':id') remove(@Param('id') id: string) {
    return this.service.remove(id);
  }
}
