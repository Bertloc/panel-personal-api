import { Body, Controller, Get, Post } from '@nestjs/common';
import { CompleteOnboardingDto } from './onboarding.dto';
import { OnboardingService } from './onboarding.service';

@Controller('api/onboarding')
export class OnboardingController {
  constructor(private readonly service: OnboardingService) {}

  @Get('status') getStatus() {
    return this.service.getStatus();
  }

  @Post('complete') complete(@Body() dto: CompleteOnboardingDto) {
    return this.service.complete(dto);
  }
}
