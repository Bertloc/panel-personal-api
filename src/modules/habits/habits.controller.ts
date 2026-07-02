import { Body, Controller, Get, Param, Patch, Post } from '@nestjs/common';
import {
  CreateHabitDto,
  LogHabitDto,
  UpdateHabitDto,
  UpdateHabitLogDto,
} from './habits.dto';
import { HabitsService } from './habits.service';
import { CurrentUserId } from '../auth/auth.decorator';
@Controller('api/habits')
export class HabitsController {
  constructor(private readonly service: HabitsService) {}
  @Get() getAll(@CurrentUserId() userId: string) {
    return this.service.getAll(userId);
  }
  @Post() create(@Body() dto: CreateHabitDto, @CurrentUserId() userId: string) {
    return this.service.create(dto, userId);
  }
  @Get('today') getToday(@CurrentUserId() userId: string) {
    return this.service.getToday(userId);
  }
  @Patch(':id') update(
    @Param('id') id: string,
    @Body() dto: UpdateHabitDto,
    @CurrentUserId() userId: string,
  ) {
    return this.service.update(id, dto, userId);
  }
  @Post(':id/logs') log(
    @Param('id') id: string,
    @Body() dto: LogHabitDto,
    @CurrentUserId() userId: string,
  ) {
    return this.service.log(id, dto, userId);
  }
  @Patch(':id/logs/:logId') updateLog(
    @Param('id') id: string,
    @Param('logId') logId: string,
    @Body() dto: UpdateHabitLogDto,
    @CurrentUserId() userId: string,
  ) {
    return this.service.updateLog(id, logId, dto, userId);
  }
}
