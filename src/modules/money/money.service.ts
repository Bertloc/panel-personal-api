import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { DEFAULT_USER_ID } from '../../common';
import { PrismaService } from '../../prisma/prisma.service';
import {
  CategoryFiltersDto,
  CreateExpenseCategoryDto,
  CreateExpenseDto,
  ExpenseFiltersDto,
  UpdateExpenseCategoryDto,
  UpdateExpenseDto,
} from './money.dto';

@Injectable()
export class MoneyService {
  constructor(private readonly prisma: PrismaService) {}

  getCategories(filters: CategoryFiltersDto) {
    return this.prisma.expenseCategory.findMany({
      where: {
        userId: DEFAULT_USER_ID,
        type: filters.type,
        isActive: filters.includeInactive ? undefined : true,
      },
      orderBy: { name: 'asc' },
    });
  }

  async createCategory(dto: CreateExpenseCategoryDto) {
    const slug = this.toSlug(dto.name);
    const exists = await this.prisma.expenseCategory.findUnique({
      where: { userId_slug: { userId: DEFAULT_USER_ID, slug } },
    });
    if (exists?.isActive)
      throw new ConflictException('Category slug already exists');
    const data = { ...dto };
    delete data.slug;
    if (exists)
      return this.prisma.expenseCategory.update({
        where: { id: exists.id, userId: DEFAULT_USER_ID },
        data: { ...data, slug, isActive: true },
      });
    return this.prisma.expenseCategory.create({
      data: { ...data, slug, userId: DEFAULT_USER_ID },
    });
  }

  async updateCategory(id: string, dto: UpdateExpenseCategoryDto) {
    await this.requireCategory(id, false);
    const slug = dto.name
      ? this.toSlug(dto.name)
      : dto.slug
        ? this.toSlug(dto.slug)
        : undefined;
    if (slug) {
      const duplicate = await this.prisma.expenseCategory.findFirst({
        where: { userId: DEFAULT_USER_ID, slug, NOT: { id } },
      });
      if (duplicate)
        throw new ConflictException('Category slug already exists');
    }
    const data = { ...dto };
    delete data.slug;
    return this.prisma.expenseCategory.update({
      where: { id, userId: DEFAULT_USER_ID },
      data: { ...data, slug },
    });
  }

  async deleteCategory(id: string) {
    await this.requireCategory(id, false);
    return this.prisma.expenseCategory.update({
      where: { id, userId: DEFAULT_USER_ID },
      data: { isActive: false },
    });
  }

  getExpenses(filters: ExpenseFiltersDto) {
    const expenseDate =
      filters.startDate || filters.endDate
        ? {
            gte: filters.startDate ? new Date(filters.startDate) : undefined,
            lte: filters.endDate ? new Date(filters.endDate) : undefined,
          }
        : undefined;
    return this.prisma.expense.findMany({
      where: {
        userId: DEFAULT_USER_ID,
        categoryId: filters.categoryId,
        source: filters.source,
        expenseDate,
      },
      include: { category: true, project: true },
      orderBy: [{ expenseDate: 'desc' }, { createdAt: 'desc' }],
    });
  }

  async getExpense(id: string) {
    const expense = await this.prisma.expense.findFirst({
      where: { id, userId: DEFAULT_USER_ID },
      include: { category: true, project: true },
    });
    if (!expense) throw new NotFoundException('Expense not found');
    return expense;
  }

  async createExpense(dto: CreateExpenseDto) {
    await this.requireCategory(dto.categoryId);
    if (dto.projectId) await this.requireProject(dto.projectId);
    return this.prisma.expense.create({
      data: {
        ...dto,
        expenseDate: new Date(dto.expenseDate),
        userId: DEFAULT_USER_ID,
      },
      include: { category: true, project: true },
    });
  }

  async updateExpense(id: string, dto: UpdateExpenseDto) {
    await this.getExpense(id);
    if (dto.categoryId) await this.requireCategory(dto.categoryId);
    if (dto.projectId) await this.requireProject(dto.projectId);
    const data: Prisma.ExpenseUpdateInput = {
      ...dto,
      expenseDate: dto.expenseDate ? new Date(dto.expenseDate) : undefined,
      category: dto.categoryId
        ? { connect: { id: dto.categoryId } }
        : undefined,
      project: dto.projectId ? { connect: { id: dto.projectId } } : undefined,
    };
    delete (data as Record<string, unknown>).categoryId;
    delete (data as Record<string, unknown>).projectId;
    return this.prisma.expense.update({
      where: { id, userId: DEFAULT_USER_ID },
      data,
      include: { category: true, project: true },
    });
  }

  async deleteExpense(id: string) {
    await this.getExpense(id);
    return this.prisma.expense.delete({
      where: { id, userId: DEFAULT_USER_ID },
    });
  }

  private async requireCategory(id: string, activeOnly = true) {
    const category = await this.prisma.expenseCategory.findFirst({
      where: {
        id,
        userId: DEFAULT_USER_ID,
        isActive: activeOnly ? true : undefined,
      },
    });
    if (!category) throw new NotFoundException('Expense category not found');
    return category;
  }

  private toSlug(value: string) {
    const slug = value
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '');
    if (!slug) throw new BadRequestException('Category name is invalid');
    return slug;
  }

  private async requireProject(id: string) {
    const project = await this.prisma.project.findFirst({
      where: { id, userId: DEFAULT_USER_ID },
    });
    if (!project) throw new NotFoundException('Project not found');
  }
}
