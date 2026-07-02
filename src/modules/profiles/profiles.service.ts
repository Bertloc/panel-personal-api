import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { UpdateProfileDto } from './profiles.dto';

@Injectable()
export class ProfilesService {
  constructor(private readonly prisma: PrismaService) {}

  get(userId: string) {
    return this.prisma.profile.upsert({
      where: { userId },
      create: { userId, displayName: 'Personal Profile' },
      update: {},
    });
  }

  update(dto: UpdateProfileDto, userId: string) {
    return this.prisma.profile.upsert({
      where: { userId },
      create: {
        userId,
        displayName: dto.displayName ?? 'Personal Profile',
        currency: dto.currency,
        timezone: dto.timezone,
      },
      update: dto,
    });
  }
}
