import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import {
  CreateIncomeEventDto,
  CreateIncomeSourceDto,
  IncomeEventsQueryDto,
  UpdateIncomeEventDto,
  UpdateIncomeSourceDto,
} from './income.dto';

@Injectable()
export class IncomeService {
  constructor(private readonly prisma: PrismaService) {}

  getAll(userId: string) {
    return this.prisma.incomeSource.findMany({
      where: { userId, isActive: true },
      orderBy: { createdAt: 'asc' },
    });
  }

  async create(dto: CreateIncomeSourceDto, userId: string) {
    await this.requireUniqueName(dto.name, userId);
    return this.prisma.incomeSource.create({
      data: {
        ...dto,
        nextPaymentDate: dto.nextPaymentDate
          ? new Date(dto.nextPaymentDate)
          : undefined,
        userId,
      },
    });
  }

  async update(id: string, dto: UpdateIncomeSourceDto, userId: string) {
    await this.require(id, userId);
    if (dto.name) await this.requireUniqueName(dto.name, userId, id);
    return this.prisma.incomeSource.update({
      where: { id, userId },
      data: {
        ...dto,
        nextPaymentDate: dto.nextPaymentDate
          ? new Date(dto.nextPaymentDate)
          : undefined,
      },
    });
  }

  async remove(id: string, userId: string) {
    await this.require(id, userId);
    return this.prisma.incomeSource.update({
      where: { id, userId },
      data: { isActive: false },
    });
  }

  getEvents(query: IncomeEventsQueryDto, userId: string) {
    const limit = query.limit ?? (query.page ? 20 : undefined);
    const incomeDate =
      query.startDate || query.endDate
        ? {
            gte: query.startDate ? new Date(query.startDate) : undefined,
            lte: query.endDate ? new Date(query.endDate) : undefined,
          }
        : undefined;
    return this.prisma.incomeEvent.findMany({
      where: {
        userId,
        sourceId: query.sourceId,
        type: query.type,
        incomeDate,
      },
      include: { incomeSource: true },
      orderBy: [{ incomeDate: 'desc' }, { createdAt: 'desc' }],
      take: limit,
      skip: limit && query.page ? limit * (query.page - 1) : undefined,
    });
  }

  async getEvent(id: string, userId: string) {
    const event = await this.prisma.incomeEvent.findFirst({
      where: { id, userId },
      include: { incomeSource: true },
    });
    if (!event) throw new NotFoundException('Income event not found');
    return event;
  }

  async createEvent(dto: CreateIncomeEventDto, userId: string) {
    const source = dto.sourceId
      ? await this.requireActiveSource(dto.sourceId, userId)
      : null;
    return this.prisma.incomeEvent.create({
      data: {
        userId,
        sourceId: dto.sourceId,
        source: source?.name ?? 'manual',
        amount: dto.amount,
        incomeDate: new Date(dto.incomeDate),
        type: dto.type ?? 'regular',
        note: dto.note,
      },
      include: { incomeSource: true },
    });
  }

  async updateEvent(id: string, dto: UpdateIncomeEventDto, userId: string) {
    await this.getEvent(id, userId);
    const source = dto.sourceId
      ? await this.requireActiveSource(dto.sourceId, userId)
      : null;
    return this.prisma.incomeEvent.update({
      where: { id, userId },
      data: {
        ...dto,
        source: source?.name,
        incomeDate: dto.incomeDate ? new Date(dto.incomeDate) : undefined,
      },
      include: { incomeSource: true },
    });
  }

  async removeEvent(id: string, userId: string) {
    await this.getEvent(id, userId);
    return this.prisma.incomeEvent.delete({
      where: { id, userId },
    });
  }

  private async require(id: string, userId: string) {
    const source = await this.prisma.incomeSource.findFirst({
      where: { id, userId },
    });
    if (!source) throw new NotFoundException('Income source not found');
    return source;
  }

  private async requireActiveSource(id: string, userId: string) {
    const source = await this.prisma.incomeSource.findFirst({
      where: { id, userId, isActive: true },
    });
    if (!source) throw new NotFoundException('Income source not found');
    return source;
  }

  private async requireUniqueName(
    name: string,
    userId: string,
    excludedId?: string,
  ) {
    if (
      await this.prisma.incomeSource.findFirst({
        where: {
          userId,
          name,
          ...(excludedId ? { NOT: { id: excludedId } } : {}),
        },
      })
    )
      throw new ConflictException('Income source name already exists');
  }
}
