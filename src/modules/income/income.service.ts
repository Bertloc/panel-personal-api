import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { DEFAULT_USER_ID } from '../../common';
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

  getAll() {
    return this.prisma.incomeSource.findMany({
      where: { userId: DEFAULT_USER_ID, isActive: true },
      orderBy: { createdAt: 'asc' },
    });
  }

  async create(dto: CreateIncomeSourceDto) {
    await this.requireUniqueName(dto.name);
    return this.prisma.incomeSource.create({
      data: {
        ...dto,
        nextPaymentDate: dto.nextPaymentDate
          ? new Date(dto.nextPaymentDate)
          : undefined,
        userId: DEFAULT_USER_ID,
      },
    });
  }

  async update(id: string, dto: UpdateIncomeSourceDto) {
    await this.require(id);
    if (dto.name) await this.requireUniqueName(dto.name, id);
    return this.prisma.incomeSource.update({
      where: { id, userId: DEFAULT_USER_ID },
      data: {
        ...dto,
        nextPaymentDate: dto.nextPaymentDate
          ? new Date(dto.nextPaymentDate)
          : undefined,
      },
    });
  }

  async remove(id: string) {
    await this.require(id);
    return this.prisma.incomeSource.update({
      where: { id, userId: DEFAULT_USER_ID },
      data: { isActive: false },
    });
  }

  getEvents(query: IncomeEventsQueryDto) {
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
        userId: DEFAULT_USER_ID,
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

  async getEvent(id: string) {
    const event = await this.prisma.incomeEvent.findFirst({
      where: { id, userId: DEFAULT_USER_ID },
      include: { incomeSource: true },
    });
    if (!event) throw new NotFoundException('Income event not found');
    return event;
  }

  async createEvent(dto: CreateIncomeEventDto) {
    const source = dto.sourceId
      ? await this.requireActiveSource(dto.sourceId)
      : null;
    return this.prisma.incomeEvent.create({
      data: {
        userId: DEFAULT_USER_ID,
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

  async updateEvent(id: string, dto: UpdateIncomeEventDto) {
    await this.getEvent(id);
    const source = dto.sourceId
      ? await this.requireActiveSource(dto.sourceId)
      : null;
    return this.prisma.incomeEvent.update({
      where: { id, userId: DEFAULT_USER_ID },
      data: {
        ...dto,
        source: source?.name,
        incomeDate: dto.incomeDate ? new Date(dto.incomeDate) : undefined,
      },
      include: { incomeSource: true },
    });
  }

  async removeEvent(id: string) {
    await this.getEvent(id);
    return this.prisma.incomeEvent.delete({
      where: { id, userId: DEFAULT_USER_ID },
    });
  }

  private async require(id: string) {
    const source = await this.prisma.incomeSource.findFirst({
      where: { id, userId: DEFAULT_USER_ID },
    });
    if (!source) throw new NotFoundException('Income source not found');
    return source;
  }

  private async requireActiveSource(id: string) {
    const source = await this.prisma.incomeSource.findFirst({
      where: { id, userId: DEFAULT_USER_ID, isActive: true },
    });
    if (!source) throw new NotFoundException('Income source not found');
    return source;
  }

  private async requireUniqueName(name: string, excludedId?: string) {
    if (
      await this.prisma.incomeSource.findFirst({
        where: {
          userId: DEFAULT_USER_ID,
          name,
          ...(excludedId ? { NOT: { id: excludedId } } : {}),
        },
      })
    )
      throw new ConflictException('Income source name already exists');
  }
}
