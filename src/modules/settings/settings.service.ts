import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { UpdateSettingsDto } from './settings.dto';

@Injectable()
export class SettingsService {
  constructor(private readonly prisma: PrismaService) {}

  async get(userId: string) {
    const settings = await this.prisma.appSettings.findUnique({
      where: { userId },
    });
    if (!settings) throw new NotFoundException('Settings not found');
    return settings;
  }

  async update(dto: UpdateSettingsDto, userId: string) {
    await this.get(userId);
    return this.prisma.appSettings.update({
      where: { userId },
      data: dto,
    });
  }
}
