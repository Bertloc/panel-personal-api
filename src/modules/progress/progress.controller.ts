import { Body, Controller, Get, Post, Query } from '@nestjs/common';
import { HeatmapQueryDto, RecalculateProgressDto } from './progress.dto';
import { ProgressService } from './progress.service';
import { CurrentUserId } from '../auth/auth.decorator';
@Controller('api/progress')
export class ProgressController {
  constructor(private readonly service: ProgressService) {}
  @Get('today') getToday(@CurrentUserId() userId: string) {
    return this.service.getToday(userId);
  }
  @Get('heatmap') getHeatmap(
    @Query() query: HeatmapQueryDto,
    @CurrentUserId() userId: string,
  ) {
    return this.service.getHeatmap(query, userId);
  }
  @Post('recalculate') recalculate(
    @Body() dto: RecalculateProgressDto,
    @CurrentUserId() userId: string,
  ) {
    return this.service.recalculate(dto, userId);
  }
}
