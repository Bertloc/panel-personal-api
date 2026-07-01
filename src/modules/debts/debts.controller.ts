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
} from './debts.dto';
import { DebtsService } from './debts.service';
@Controller('api/debts')
export class DebtsController {
  constructor(private readonly service: DebtsService) {}
  @Get() getAll(@Query() filters: DebtFiltersDto) {
    return this.service.getAll(filters);
  }
  @Post() create(@Body() dto: CreateDebtDto) {
    return this.service.create(dto);
  }
  @Get(':id') get(@Param('id') id: string) {
    return this.service.get(id);
  }
  @Patch(':id') update(@Param('id') id: string, @Body() dto: UpdateDebtDto) {
    return this.service.update(id, dto);
  }
  @Delete(':id') remove(@Param('id') id: string) {
    return this.service.remove(id);
  }
  @Post(':id/payments') addPayment(
    @Param('id') id: string,
    @Body() dto: CreateDebtPaymentDto,
  ) {
    return this.service.addPayment(id, dto);
  }
  @Get(':id/payments') getPayments(@Param('id') id: string) {
    return this.service.getPayments(id);
  }
  @Get(':id/projection') projection(@Param('id') id: string) {
    return this.service.projection(id);
  }
}
