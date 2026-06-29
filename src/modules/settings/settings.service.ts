import { Injectable, NotFoundException } from '@nestjs/common';
import { DEFAULT_USER_ID } from '../../common';
import { PrismaService } from '../../prisma/prisma.service';
import { UpdateSettingsDto } from './settings.dto';

@Injectable()
export class SettingsService {
  constructor(private readonly prisma: PrismaService) {}

  async get() {
    const settings = await this.prisma.appSettings.findUnique({
      where: { userId: DEFAULT_USER_ID },
    });
    if (!settings) throw new NotFoundException('Settings not found');
    return settings;
  }

  async update(dto: UpdateSettingsDto) {
    await this.get();
    return this.prisma.appSettings.update({
      where: { userId: DEFAULT_USER_ID },
      data: dto,
    });
  }
}
