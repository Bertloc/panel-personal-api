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
  CreateIncomeEventDto,
  CreateIncomeSourceDto,
  IncomeEventsQueryDto,
  UpdateIncomeEventDto,
  UpdateIncomeSourceDto,
} from './income.dto';
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

@Controller('api/income/events')
export class IncomeEventsController {
  constructor(private readonly service: IncomeService) {}

  @Get()
  getAll(@Query() query: IncomeEventsQueryDto) {
    return this.service.getEvents(query);
  }

  @Post()
  create(@Body() dto: CreateIncomeEventDto) {
    return this.service.createEvent(dto);
  }

  @Get(':id')
  get(@Param('id') id: string) {
    return this.service.getEvent(id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateIncomeEventDto) {
    return this.service.updateEvent(id, dto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.service.removeEvent(id);
  }
}
