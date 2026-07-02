import { Controller, Get } from '@nestjs/common';
import { DashboardService } from './dashboard.service';
import { CurrentUserId } from '../auth/auth.decorator';
@Controller('api/dashboard')
export class DashboardController {
  constructor(private readonly service: DashboardService) {}
  @Get('summary') summary(@CurrentUserId() userId: string) {
    return this.service.summary(userId);
  }
}
