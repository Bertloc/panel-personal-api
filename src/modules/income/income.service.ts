import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { DEFAULT_USER_ID } from '../../common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateIncomeSourceDto, UpdateIncomeSourceDto } from './income.dto';

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

  private async require(id: string) {
    const source = await this.prisma.incomeSource.findFirst({
      where: { id, userId: DEFAULT_USER_ID },
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
