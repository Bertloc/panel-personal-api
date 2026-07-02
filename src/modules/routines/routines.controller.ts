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
  CreateRoutineDto,
  CreateRoutineItemDto,
  CreateRoutineLogDto,
  RoutineHistoryQueryDto,
  RoutineQueryDto,
  RoutineSummaryQueryDto,
  RoutineTodayQueryDto,
  UpdateRoutineDto,
  UpdateRoutineItemDto,
  UpdateRoutineLogDto,
} from './routines.dto';
import { RoutinesService } from './routines.service';
import { CurrentUserId } from '../auth/auth.decorator';

@Controller('api/routines')
export class RoutinesController {
  constructor(private readonly service: RoutinesService) {}

  @Get()
  getAll(@Query() query: RoutineQueryDto, @CurrentUserId() userId: string) {
    return this.service.getAll(query, userId);
  }

  @Post()
  create(@Body() dto: CreateRoutineDto, @CurrentUserId() userId: string) {
    return this.service.create(dto, userId);
  }

  @Get('today')
  getToday(
    @Query() query: RoutineTodayQueryDto,
    @CurrentUserId() userId: string,
  ) {
    return this.service.getToday(query, userId);
  }

  @Get('history')
  history(
    @Query() query: RoutineHistoryQueryDto,
    @CurrentUserId() userId: string,
  ) {
    return this.service.history(query, userId);
  }

  @Get('summary')
  summary(
    @Query() query: RoutineSummaryQueryDto,
    @CurrentUserId() userId: string,
  ) {
    return this.service.summary(query, userId);
  }

  @Post('logs')
  createLog(@Body() dto: CreateRoutineLogDto, @CurrentUserId() userId: string) {
    return this.service.createLog(dto, userId);
  }

  @Patch('logs/:logId')
  updateLog(
    @Param('logId') logId: string,
    @Body() dto: UpdateRoutineLogDto,
    @CurrentUserId() userId: string,
  ) {
    return this.service.updateLog(logId, dto, userId);
  }

  @Delete('logs/:logId')
  removeLog(@Param('logId') logId: string, @CurrentUserId() userId: string) {
    return this.service.removeLog(logId, userId);
  }

  @Patch('items/:itemId')
  updateItem(
    @Param('itemId') itemId: string,
    @Body() dto: UpdateRoutineItemDto,
    @CurrentUserId() userId: string,
  ) {
    return this.service.updateItem(itemId, dto, userId);
  }

  @Delete('items/:itemId')
  removeItem(@Param('itemId') itemId: string, @CurrentUserId() userId: string) {
    return this.service.removeItem(itemId, userId);
  }

  @Get(':routineId/items')
  getItems(
    @Param('routineId') routineId: string,
    @CurrentUserId() userId: string,
  ) {
    return this.service.getItems(routineId, userId);
  }

  @Post(':routineId/items')
  createItem(
    @Param('routineId') routineId: string,
    @Body() dto: CreateRoutineItemDto,
    @CurrentUserId() userId: string,
  ) {
    return this.service.createItem(routineId, dto, userId);
  }

  @Get(':id')
  get(@Param('id') id: string, @CurrentUserId() userId: string) {
    return this.service.get(id, userId);
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() dto: UpdateRoutineDto,
    @CurrentUserId() userId: string,
  ) {
    return this.service.update(id, dto, userId);
  }

  @Delete(':id')
  remove(@Param('id') id: string, @CurrentUserId() userId: string) {
    return this.service.remove(id, userId);
  }
}
