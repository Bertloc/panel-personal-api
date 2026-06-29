import { Body, Controller, Get, Param, Patch, Post } from '@nestjs/common';
import {
  CreateSavingsGoalDto,
  CreateSavingsMovementDto,
  UpdateSavingsGoalDto,
} from './savings.dto';
import { SavingsService } from './savings.service';
@Controller('api/savings')
export class SavingsController {
  constructor(private readonly service: SavingsService) {}
  @Get('goals') getAll() {
    return this.service.getAll();
  }
  @Post('goals') create(@Body() dto: CreateSavingsGoalDto) {
    return this.service.create(dto);
  }
  @Get('goals/:id') get(@Param('id') id: string) {
    return this.service.get(id);
  }
  @Patch('goals/:id') update(
    @Param('id') id: string,
    @Body() dto: UpdateSavingsGoalDto,
  ) {
    return this.service.update(id, dto);
  }
  @Post('goals/:id/movements') addMovement(
    @Param('id') id: string,
    @Body() dto: CreateSavingsMovementDto,
  ) {
    return this.service.addMovement(id, dto);
  }
  @Get('goals/:id/movements') getMovements(@Param('id') id: string) {
    return this.service.getMovements(id);
  }
}
