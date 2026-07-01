import { Injectable } from '@nestjs/common';
import { DEFAULT_USER_ID } from '../../common';
import { PrismaService } from '../../prisma/prisma.service';
import { UpdateProfileDto } from './profiles.dto';

@Injectable()
export class ProfilesService {
  constructor(private readonly prisma: PrismaService) {}

  get() {
    return this.prisma.profile.upsert({
      where: { userId: DEFAULT_USER_ID },
      create: { userId: DEFAULT_USER_ID, displayName: 'Personal Profile' },
      update: {},
    });
  }

  update(dto: UpdateProfileDto) {
    return this.prisma.profile.upsert({
      where: { userId: DEFAULT_USER_ID },
      create: {
        userId: DEFAULT_USER_ID,
        displayName: dto.displayName ?? 'Personal Profile',
        currency: dto.currency,
        timezone: dto.timezone,
      },
      update: dto,
    });
  }
}
