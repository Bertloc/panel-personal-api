import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { DEFAULT_USER_ID } from '../../common';
import { PrismaService } from '../../prisma/prisma.service';
import {
  CreateProjectBudgetDto,
  CreateProjectDto,
  CreateProjectTaskDto,
  ProjectQueryDto,
  ProjectTaskQueryDto,
  UpdateProjectBudgetDto,
  UpdateProjectDto,
  UpdateProjectTaskDto,
} from './projects.dto';

const completedStatuses = ['completed', 'done'];
const priorityRank: Record<string, number> = {
  urgent: 4,
  critical: 4,
  high: 3,
  medium: 2,
  low: 1,
};

type ProjectWithRelations = Prisma.ProjectGetPayload<{
  include: { tasks: true; budgets: true };
}>;

@Injectable()
export class ProjectsService {
  constructor(private readonly prisma: PrismaService) {}

  async getAll(query: ProjectQueryDto = {}) {
    const limit = query.limit ?? (query.page ? 20 : undefined);
    const projects = await this.prisma.project.findMany({
      where: {
        userId: DEFAULT_USER_ID,
        status: query.status
          ? query.status
          : query.includeArchived
            ? undefined
            : { notIn: ['archived', 'cancelled'] },
        priority: query.priority
          ? { in: this.compatiblePriorities(query.priority) }
          : undefined,
        category: query.category,
      },
      include: {
        tasks: { where: { userId: DEFAULT_USER_ID } },
        budgets: { where: { userId: DEFAULT_USER_ID } },
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
      skip: limit && query.page ? limit * (query.page - 1) : undefined,
    });
    return projects.map((project) =>
      this.withProgress(project, query.includeTasks),
    );
  }

  async get(id: string) {
    const project = await this.prisma.project.findFirst({
      where: { id, userId: DEFAULT_USER_ID },
      include: {
        tasks: {
          where: { userId: DEFAULT_USER_ID },
          orderBy: [{ order: 'asc' }, { createdAt: 'asc' }],
        },
        budgets: { where: { userId: DEFAULT_USER_ID } },
      },
    });
    if (!project) throw new NotFoundException('Project not found');
    return this.withProgress(project, true);
  }

  async create(dto: CreateProjectDto) {
    this.validateDates(dto.startDate, dto.targetDate);
    const { budgetAmount, ...projectData } = dto;
    const project = await this.prisma.$transaction(async (tx) => {
      const created = await tx.project.create({
        data: {
          ...projectData,
          priority: this.normalizePriority(dto.priority ?? 'medium'),
          status: dto.status ?? 'planned',
          consumesMoney: dto.consumesMoney ?? false,
          startDate: dto.startDate ? new Date(dto.startDate) : undefined,
          targetDate: dto.targetDate ? new Date(dto.targetDate) : undefined,
          userId: DEFAULT_USER_ID,
        },
      });
      if (budgetAmount !== undefined)
        await tx.projectBudget.create({
          data: {
            userId: DEFAULT_USER_ID,
            projectId: created.id,
            name: 'Project budget',
            plannedAmount: budgetAmount,
          },
        });
      return created;
    });
    return this.get(project.id);
  }

  async update(id: string, dto: UpdateProjectDto) {
    const current = await this.requireProject(id);
    this.validateDates(
      dto.startDate ?? current.startDate?.toISOString(),
      dto.targetDate ?? current.targetDate?.toISOString(),
    );
    const { budgetAmount, ...projectData } = dto;
    await this.prisma.$transaction(async (tx) => {
      await tx.project.update({
        where: { id, userId: DEFAULT_USER_ID },
        data: {
          ...projectData,
          priority: dto.priority
            ? this.normalizePriority(dto.priority)
            : undefined,
          startDate: dto.startDate ? new Date(dto.startDate) : undefined,
          targetDate: dto.targetDate ? new Date(dto.targetDate) : undefined,
        },
      });
      if (budgetAmount !== undefined) {
        const budget = await tx.projectBudget.findFirst({
          where: { projectId: id, userId: DEFAULT_USER_ID },
          orderBy: { createdAt: 'asc' },
        });
        if (budget)
          await tx.projectBudget.update({
            where: { id: budget.id, userId: DEFAULT_USER_ID },
            data: { plannedAmount: budgetAmount },
          });
        else
          await tx.projectBudget.create({
            data: {
              userId: DEFAULT_USER_ID,
              projectId: id,
              name: 'Project budget',
              plannedAmount: budgetAmount,
            },
          });
      }
    });
    return this.get(id);
  }

  async remove(id: string) {
    await this.requireProject(id);
    return this.prisma.project.update({
      where: { id, userId: DEFAULT_USER_ID },
      data: { status: 'archived' },
    });
  }

  async createTask(projectId: string, dto: CreateProjectTaskDto) {
    await this.requireProject(projectId);
    const status = this.normalizeTaskStatus(dto.status ?? 'pending');
    return this.prisma.projectTask.create({
      data: {
        ...dto,
        status,
        priority: this.normalizePriority(dto.priority ?? 'medium'),
        dueDate: dto.dueDate ? new Date(dto.dueDate) : undefined,
        completedAt: status === 'completed' ? new Date() : null,
        projectId,
        userId: DEFAULT_USER_ID,
      },
    });
  }

  async getTasks(projectId: string, query: ProjectTaskQueryDto = {}) {
    await this.requireProject(projectId);
    return this.prisma.projectTask.findMany({
      where: {
        projectId,
        userId: DEFAULT_USER_ID,
        status: query.status
          ? { in: this.compatibleTaskStatuses(query.status) }
          : query.includeCancelled
            ? undefined
            : { not: 'cancelled' },
        priority: query.priority
          ? { in: this.compatiblePriorities(query.priority) }
          : undefined,
      },
      orderBy: [{ order: 'asc' }, { createdAt: 'asc' }],
    });
  }

  async updateTask(
    taskId: string,
    dto: UpdateProjectTaskDto,
    projectId?: string,
  ) {
    await this.requireTask(taskId, projectId);
    const status = dto.status
      ? this.normalizeTaskStatus(dto.status)
      : undefined;
    return this.prisma.projectTask.update({
      where: { id: taskId, userId: DEFAULT_USER_ID },
      data: {
        ...dto,
        status,
        priority: dto.priority
          ? this.normalizePriority(dto.priority)
          : undefined,
        dueDate: dto.dueDate ? new Date(dto.dueDate) : undefined,
        completedAt: status
          ? status === 'completed'
            ? new Date()
            : null
          : undefined,
      },
    });
  }

  async deleteTask(taskId: string, projectId?: string) {
    await this.requireTask(taskId, projectId);
    return this.prisma.projectTask.update({
      where: { id: taskId, userId: DEFAULT_USER_ID },
      data: { status: 'cancelled', completedAt: null },
    });
  }

  async summary() {
    const projects = await this.prisma.project.findMany({
      where: { userId: DEFAULT_USER_ID },
      include: {
        tasks: { where: { userId: DEFAULT_USER_ID } },
        budgets: { where: { userId: DEFAULT_USER_ID } },
      },
    });
    const mapped = projects.map((project) => this.withProgress(project, true));
    const candidates = mapped
      .filter(
        (project) =>
          !['completed', 'cancelled', 'archived'].includes(project.status),
      )
      .sort((a, b) => b.progressPercent - a.progressPercent);
    const upcomingTasks = mapped
      .filter((project) => !['cancelled', 'archived'].includes(project.status))
      .flatMap((project) =>
        (project.tasks ?? [])
          .filter(
            (task) =>
              !completedStatuses.includes(task.status) &&
              task.status !== 'cancelled',
          )
          .map((task) => ({
            ...task,
            projectName: project.name,
          })),
      )
      .sort(
        (a, b) =>
          (a.dueDate?.getTime() ?? Number.MAX_SAFE_INTEGER) -
            (b.dueDate?.getTime() ?? Number.MAX_SAFE_INTEGER) ||
          (priorityRank[b.priority] ?? 0) - (priorityRank[a.priority] ?? 0),
      );
    const budgetProjects = mapped.filter((project) =>
      ['active', 'planned'].includes(project.status),
    );
    const planned = budgetProjects.reduce(
      (sum, project) => sum + project.budgetAmount,
      0,
    );
    const spent = budgetProjects.reduce(
      (sum, project) => sum + project.actualCost,
      0,
    );
    const count = (status: string) =>
      mapped.filter((project) => project.status === status).length;
    return {
      total: mapped.length,
      active: count('active'),
      planned: count('planned'),
      paused: count('paused'),
      completed: count('completed'),
      cancelled: count('cancelled'),
      archived: count('archived'),
      nearCompletion: mapped.filter(
        (project) =>
          project.status === 'active' &&
          project.progressPercent >= 75 &&
          project.progressPercent < 100,
      ).length,
      highestProgressProject: candidates[0]
        ? {
            id: candidates[0].id,
            name: candidates[0].name,
            progressPercent: candidates[0].progressPercent,
          }
        : null,
      upcomingTasks,
      budget: { planned, spent, remaining: planned - spent },
    };
  }

  async getBudgets(projectId: string) {
    await this.requireProject(projectId);
    return this.prisma.projectBudget.findMany({
      where: { projectId, userId: DEFAULT_USER_ID },
      orderBy: { createdAt: 'asc' },
    });
  }

  async createBudget(projectId: string, dto: CreateProjectBudgetDto) {
    await this.requireProject(projectId);
    return this.prisma.projectBudget.create({
      data: { ...dto, projectId, userId: DEFAULT_USER_ID },
    });
  }

  async updateBudget(
    projectId: string,
    budgetId: string,
    dto: UpdateProjectBudgetDto,
  ) {
    const budget = await this.prisma.projectBudget.findFirst({
      where: { id: budgetId, projectId, userId: DEFAULT_USER_ID },
    });
    if (!budget) throw new NotFoundException('Project budget not found');
    return this.prisma.projectBudget.update({
      where: { id: budgetId, userId: DEFAULT_USER_ID },
      data: dto,
    });
  }

  private withProgress(project: ProjectWithRelations, includeTasks = false) {
    const activeTasks = project.tasks.filter(
      (task) => task.status !== 'cancelled',
    );
    const completedTasks = activeTasks.filter((task) =>
      completedStatuses.includes(task.status),
    ).length;
    const calculatedProgress = activeTasks.length
      ? Math.round((completedTasks / activeTasks.length) * 100)
      : 0;
    const progressPercent =
      project.status === 'completed' ? 100 : calculatedProgress;
    const budgetAmount = project.budgets.reduce(
      (sum, budget) => sum + Number(budget.plannedAmount),
      0,
    );
    const actualCost =
      activeTasks.reduce((sum, task) => sum + Number(task.actualCost ?? 0), 0) +
      project.budgets.reduce(
        (sum, budget) => sum + Number(budget.spentAmount),
        0,
      );
    const nextTask = activeTasks
      .filter((task) => !completedStatuses.includes(task.status))
      .sort(
        (a, b) =>
          (a.dueDate?.getTime() ?? Number.MAX_SAFE_INTEGER) -
            (b.dueDate?.getTime() ?? Number.MAX_SAFE_INTEGER) ||
          a.order - b.order,
      )[0];
    const { tasks, budgets, ...data } = project;
    return {
      ...data,
      budgetAmount,
      actualCost,
      tasksCount: activeTasks.length,
      completedTasks,
      progressPercent,
      nextTask: nextTask ?? null,
      stats: { totalTasks: activeTasks.length, completedTasks },
      // Existing frontend aliases.
      progress: progressPercent,
      budget: budgetAmount,
      ...(includeTasks ? { tasks, budgets } : {}),
    };
  }

  private validateDates(start?: string, target?: string) {
    if (start && target && new Date(start) > new Date(target))
      throw new BadRequestException(
        'startDate must be before or equal to targetDate',
      );
  }

  private normalizeTaskStatus(status: string) {
    return status === 'todo'
      ? 'pending'
      : status === 'done'
        ? 'completed'
        : status;
  }

  private compatibleTaskStatuses(status: string) {
    if (status === 'pending' || status === 'todo') return ['pending', 'todo'];
    if (status === 'completed' || status === 'done')
      return ['completed', 'done'];
    return [status];
  }

  private normalizePriority(priority: string) {
    return priority === 'critical' ? 'urgent' : priority;
  }

  private compatiblePriorities(priority: string) {
    return priority === 'urgent' || priority === 'critical'
      ? ['urgent', 'critical']
      : [priority];
  }

  private async requireProject(id: string) {
    const project = await this.prisma.project.findFirst({
      where: { id, userId: DEFAULT_USER_ID },
    });
    if (!project) throw new NotFoundException('Project not found');
    return project;
  }

  private async requireTask(id: string, projectId?: string) {
    const task = await this.prisma.projectTask.findFirst({
      where: { id, projectId, userId: DEFAULT_USER_ID },
    });
    if (!task) throw new NotFoundException('Project task not found');
    return task;
  }
}
