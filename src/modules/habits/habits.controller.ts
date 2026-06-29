import { Body, Controller, Get, Param, Patch, Post } from '@nestjs/common';
import {
  CreateHabitDto,
  LogHabitDto,
  UpdateHabitDto,
  UpdateHabitLogDto,
} from './habits.dto';
import { HabitsService } from './habits.service';
@Controller('api/habits')
export class HabitsController {
  constructor(private readonly service: HabitsService) {}
  @Get() getAll() {
    return this.service.getAll();
  }
  @Post() create(@Body() dto: CreateHabitDto) {
    return this.service.create(dto);
  }
  @Get('today') getToday() {
    return this.service.getToday();
  }
  @Patch(':id') update(@Param('id') id: string, @Body() dto: UpdateHabitDto) {
    return this.service.update(id, dto);
  }
  @Post(':id/logs') log(@Param('id') id: string, @Body() dto: LogHabitDto) {
    return this.service.log(id, dto);
  }
  @Patch(':id/logs/:logId') updateLog(
    @Param('id') id: string,
    @Param('logId') logId: string,
    @Body() dto: UpdateHabitLogDto,
  ) {
    return this.service.updateLog(id, logId, dto);
  }
}
