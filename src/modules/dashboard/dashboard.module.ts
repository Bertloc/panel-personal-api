import { Module } from '@nestjs/common';
import { DashboardController } from './dashboard.controller';
import { DashboardService } from './dashboard.service';
import { RoutinesModule } from '../routines/routines.module';
import { ProjectsModule } from '../projects/projects.module';
@Module({
  imports: [RoutinesModule, ProjectsModule],
  controllers: [DashboardController],
  providers: [DashboardService],
})
export class DashboardModule {}
