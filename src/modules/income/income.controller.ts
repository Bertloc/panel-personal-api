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
import { CurrentUserId } from '../auth/auth.decorator';

@Controller('api/income/sources')
export class IncomeController {
  constructor(private readonly service: IncomeService) {}

  @Get() getAll(@CurrentUserId() userId: string) {
    return this.service.getAll(userId);
  }

  @Post() create(
    @Body() dto: CreateIncomeSourceDto,
    @CurrentUserId() userId: string,
  ) {
    return this.service.create(dto, userId);
  }

  @Patch(':id') update(
    @Param('id') id: string,
    @Body() dto: UpdateIncomeSourceDto,
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

@Controller('api/income/events')
export class IncomeEventsController {
  constructor(private readonly service: IncomeService) {}

  @Get()
  getAll(
    @Query() query: IncomeEventsQueryDto,
    @CurrentUserId() userId: string,
  ) {
    return this.service.getEvents(query, userId);
  }

  @Post()
  create(@Body() dto: CreateIncomeEventDto, @CurrentUserId() userId: string) {
    return this.service.createEvent(dto, userId);
  }

  @Get(':id')
  get(@Param('id') id: string, @CurrentUserId() userId: string) {
    return this.service.getEvent(id, userId);
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() dto: UpdateIncomeEventDto,
    @CurrentUserId() userId: string,
  ) {
    return this.service.updateEvent(id, dto, userId);
  }

  @Delete(':id')
  remove(@Param('id') id: string, @CurrentUserId() userId: string) {
    return this.service.removeEvent(id, userId);
  }
}
