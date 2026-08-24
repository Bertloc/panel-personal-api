import { Module } from '@nestjs/common';
import { RoutinesModule } from '../routines/routines.module';
import { ProgressController } from './progress.controller';
import { ProgressService } from './progress.service';
@Module({
  imports: [RoutinesModule],
  controllers: [ProgressController],
  providers: [ProgressService],
})
export class ProgressModule {}
