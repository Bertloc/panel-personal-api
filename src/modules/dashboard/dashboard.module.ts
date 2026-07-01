import { Module } from '@nestjs/common';
import { DashboardController } from './dashboard.controller';
import { DashboardService } from './dashboard.service';
import { RoutinesModule } from '../routines/routines.module';
@Module({
  imports: [RoutinesModule],
  controllers: [DashboardController],
  providers: [DashboardService],
})
export class DashboardModule {}
