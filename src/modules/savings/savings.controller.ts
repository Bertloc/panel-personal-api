import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
} from '@nestjs/common';
import {
  CreateSavingsGoalDto,
  CreateSavingsMovementDto,
  UpdateSavingsGoalDto,
  UpdateSavingsMovementDto,
} from './savings.dto';
import { SavingsService } from './savings.service';
import { CurrentUserId } from '../auth/auth.decorator';
@Controller('api/savings')
export class SavingsController {
  constructor(private readonly service: SavingsService) {}
  @Get('goals') getAll(@CurrentUserId() userId: string) {
    return this.service.getAll(userId);
  }
  @Post('goals') create(
    @Body() dto: CreateSavingsGoalDto,
    @CurrentUserId() userId: string,
  ) {
    return this.service.create(dto, userId);
  }
  @Get('goals/:id') get(
    @Param('id') id: string,
    @CurrentUserId() userId: string,
  ) {
    return this.service.get(id, userId);
  }
  @Patch('goals/:id') update(
    @Param('id') id: string,
    @Body() dto: UpdateSavingsGoalDto,
    @CurrentUserId() userId: string,
  ) {
    return this.service.update(id, dto, userId);
  }
  @Delete('goals/:id') remove(
    @Param('id') id: string,
    @CurrentUserId() userId: string,
  ) {
    return this.service.remove(id, userId);
  }
  @Post('goals/:id/movements') addMovement(
    @Param('id') id: string,
    @Body() dto: CreateSavingsMovementDto,
    @CurrentUserId() userId: string,
  ) {
    return this.service.addMovement(id, dto, userId);
  }
  @Get('goals/:id/movements') getMovements(
    @Param('id') id: string,
    @CurrentUserId() userId: string,
  ) {
    return this.service.getMovements(id, userId);
  }
  @Patch('movements/:movementId') updateMovement(
    @Param('movementId') movementId: string,
    @Body() dto: UpdateSavingsMovementDto,
    @CurrentUserId() userId: string,
  ) {
    return this.service.updateMovement(movementId, dto, userId);
  }
  @Delete('movements/:movementId') removeMovement(
    @Param('movementId') movementId: string,
    @CurrentUserId() userId: string,
  ) {
    return this.service.removeMovement(movementId, userId);
  }
}
