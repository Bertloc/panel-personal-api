import { Body, Controller, Get, Patch } from '@nestjs/common';
import { UpdateProfileDto } from './profiles.dto';
import { ProfilesService } from './profiles.service';

@Controller('api/profiles')
export class ProfilesController {
  constructor(private readonly service: ProfilesService) {}

  @Get('me') get() {
    return this.service.get();
  }

  @Patch('me') update(@Body() dto: UpdateProfileDto) {
    return this.service.update(dto);
  }
}
