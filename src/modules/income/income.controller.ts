import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
} from '@nestjs/common';
import { CreateIncomeSourceDto, UpdateIncomeSourceDto } from './income.dto';
import { IncomeService } from './income.service';

@Controller('api/income/sources')
export class IncomeController {
  constructor(private readonly service: IncomeService) {}

  @Get() getAll() {
    return this.service.getAll();
  }

  @Post() create(@Body() dto: CreateIncomeSourceDto) {
    return this.service.create(dto);
  }

  @Patch(':id') update(
    @Param('id') id: string,
    @Body() dto: UpdateIncomeSourceDto,
  ) {
    return this.service.update(id, dto);
  }

  @Delete(':id') remove(@Param('id') id: string) {
    return this.service.remove(id);
  }
}
