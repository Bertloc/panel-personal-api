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

@Controller('api/routines')
export class RoutinesController {
  constructor(private readonly service: RoutinesService) {}

  @Get()
  getAll(@Query() query: RoutineQueryDto) {
    return this.service.getAll(query);
  }

  @Post()
  create(@Body() dto: CreateRoutineDto) {
    return this.service.create(dto);
  }

  @Get('today')
  getToday(@Query() query: RoutineTodayQueryDto) {
    return this.service.getToday(query);
  }

  @Get('history')
  history(@Query() query: RoutineHistoryQueryDto) {
    return this.service.history(query);
  }

  @Get('summary')
  summary(@Query() query: RoutineSummaryQueryDto) {
    return this.service.summary(query);
  }

  @Post('logs')
  createLog(@Body() dto: CreateRoutineLogDto) {
    return this.service.createLog(dto);
  }

  @Patch('logs/:logId')
  updateLog(@Param('logId') logId: string, @Body() dto: UpdateRoutineLogDto) {
    return this.service.updateLog(logId, dto);
  }

  @Delete('logs/:logId')
  removeLog(@Param('logId') logId: string) {
    return this.service.removeLog(logId);
  }

  @Patch('items/:itemId')
  updateItem(
    @Param('itemId') itemId: string,
    @Body() dto: UpdateRoutineItemDto,
  ) {
    return this.service.updateItem(itemId, dto);
  }

  @Delete('items/:itemId')
  removeItem(@Param('itemId') itemId: string) {
    return this.service.removeItem(itemId);
  }

  @Get(':routineId/items')
  getItems(@Param('routineId') routineId: string) {
    return this.service.getItems(routineId);
  }

  @Post(':routineId/items')
  createItem(
    @Param('routineId') routineId: string,
    @Body() dto: CreateRoutineItemDto,
  ) {
    return this.service.createItem(routineId, dto);
  }

  @Get(':id')
  get(@Param('id') id: string) {
    return this.service.get(id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateRoutineDto) {
    return this.service.update(id, dto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.service.remove(id);
  }
}
