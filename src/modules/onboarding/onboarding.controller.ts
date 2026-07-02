import { Body, Controller, Get, Post } from '@nestjs/common';
import { CompleteOnboardingDto } from './onboarding.dto';
import { OnboardingService } from './onboarding.service';
import { CurrentUserId } from '../auth/auth.decorator';

@Controller('api/onboarding')
export class OnboardingController {
  constructor(private readonly service: OnboardingService) {}

  @Get('status') getStatus(@CurrentUserId() userId: string) {
    return this.service.getStatus(userId);
  }

  @Post('complete') complete(
    @Body() dto: CompleteOnboardingDto,
    @CurrentUserId() userId: string,
  ) {
    return this.service.complete(dto, userId);
  }
}
