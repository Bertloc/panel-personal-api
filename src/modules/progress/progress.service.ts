import { BadRequestException, Injectable } from '@nestjs/common';
import { DailyProgress } from '@prisma/client';
import { nextUtcDay, startOfUtcDay } from '../../common';
import { PrismaService } from '../../prisma/prisma.service';
import { RoutinesService } from '../routines/routines.service';
import { calculateDailyProgress } from './daily-progress';
import { HeatmapQueryDto, RecalculateProgressDto } from './progress.dto';
@Injectable()
export class ProgressService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly routines: RoutinesService,
  ) {}
  async getToday(userId: string) {
    const date = startOfUtcDay();
    return (
      (await this.prisma.dailyProgress.findUnique({
        where: {
          userId_progressDate_filterType: {
            userId,
            progressDate: date,
            filterType: 'general',
          },
        },
      })) ?? this.calculate(date, userId)
    );
  }
  getHeatmap(query: HeatmapQueryDto, userId: string) {
    const year = query.year ?? new Date().getUTCFullYear();
    const filterType = query.filter ?? query.filterType ?? 'general';
    return this.prisma.dailyProgress.findMany({
      where: {
        userId,
        filterType,
        progressDate: {
          gte: new Date(Date.UTC(year, 0, 1)),
          lt: new Date(Date.UTC(year + 1, 0, 1)),
        },
      },
      orderBy: { progressDate: 'asc' },
    });
  }
  async recalculate(dto: RecalculateProgressDto, userId: string) {
    const start = startOfUtcDay(
      new Date(dto.date ?? dto.startDate ?? Date.now()),
    );
    const end = startOfUtcDay(
      new Date(dto.date ?? dto.endDate ?? dto.startDate ?? Date.now()),
    );
    if (start > end)
      throw new BadRequestException(
        'startDate must be before or equal to endDate',
      );
    const days = Math.round((end.getTime() - start.getTime()) / 86400000) + 1;
    if (days > 366)
      throw new BadRequestException('Date range cannot exceed 366 days');
    const results: DailyProgress[] = [];
    for (let date = start; date <= end; date = nextUtcDay(date))
      results.push(await this.calculate(date, userId));
    return results;
  }
  async calculate(date: Date, userId: string) {
    const routine = await this.routines.getSummaryForDate(date, userId);
    return calculateDailyProgress(this.prisma, date, userId, routine);
  }
}
