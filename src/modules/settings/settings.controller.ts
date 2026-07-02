import { Body, Controller, Get, Patch } from '@nestjs/common';
import { UpdateSettingsDto } from './settings.dto';
import { SettingsService } from './settings.service';
import { CurrentUserId } from '../auth/auth.decorator';

@Controller('api/settings')
export class SettingsController {
  constructor(private readonly settingsService: SettingsService) {}

  @Get()
  get(@CurrentUserId() userId: string) {
    return this.settingsService.get(userId);
  }

  @Patch()
  update(@Body() dto: UpdateSettingsDto, @CurrentUserId() userId: string) {
    return this.settingsService.update(dto, userId);
  }
}
