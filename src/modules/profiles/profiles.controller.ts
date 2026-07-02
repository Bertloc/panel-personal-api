import { Body, Controller, Get, Patch } from '@nestjs/common';
import { UpdateProfileDto } from './profiles.dto';
import { ProfilesService } from './profiles.service';
import { CurrentUserId } from '../auth/auth.decorator';

@Controller('api/profiles')
export class ProfilesController {
  constructor(private readonly service: ProfilesService) {}

  @Get('me') get(@CurrentUserId() userId: string) {
    return this.service.get(userId);
  }

  @Patch('me') update(
    @Body() dto: UpdateProfileDto,
    @CurrentUserId() userId: string,
  ) {
    return this.service.update(dto, userId);
  }
}
