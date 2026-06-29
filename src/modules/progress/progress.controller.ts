import { Body, Controller, Get, Post, Query } from '@nestjs/common';
import { HeatmapQueryDto, RecalculateProgressDto } from './progress.dto';
import { ProgressService } from './progress.service';
@Controller('api/progress')
export class ProgressController {
  constructor(private readonly service: ProgressService) {}
  @Get('today') getToday() {
    return this.service.getToday();
  }
  @Get('heatmap') getHeatmap(@Query() query: HeatmapQueryDto) {
    return this.service.getHeatmap(query);
  }
  @Post('recalculate') recalculate(@Body() dto: RecalculateProgressDto) {
    return this.service.recalculate(dto);
  }
}
