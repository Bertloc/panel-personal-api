import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
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

  async getAll(query: ProjectQueryDto, userId: string) {
    const limit = query.limit ?? (query.page ? 20 : undefined);
    const projects = await this.prisma.project.findMany({
      where: {
        userId,
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
        tasks: { where: { userId } },
        budgets: { where: { userId } },
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
      skip: limit && query.page ? limit * (query.page - 1) : undefined,
    });
    return projects.map((project) =>
      this.withProgress(project, query.includeTasks),
    );
  }

  async get(id: string, userId: string) {
    const project = await this.prisma.project.findFirst({
      where: { id, userId },
      include: {
        tasks: {
          where: { userId },
          orderBy: [{ order: 'asc' }, { createdAt: 'asc' }],
        },
        budgets: { where: { userId } },
      },
    });
    if (!project) throw new NotFoundException('Project not found');
    return this.withProgress(project, true);
  }

  async create(dto: CreateProjectDto, userId: string) {
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
          userId,
        },
      });
      if (created.consumesMoney && budgetAmount !== undefined)
        await tx.projectBudget.create({
          data: {
            userId,
            projectId: created.id,
            name: 'Project budget',
            plannedAmount: budgetAmount,
          },
        });
      return created;
    });
    return this.get(project.id, userId);
  }

  async update(id: string, dto: UpdateProjectDto, userId: string) {
    const current = await this.requireProject(id, userId);
    if (dto.status === 'completed')
      await this.validateProjectCompletion(id, userId);
    this.validateDates(
      dto.startDate ?? current.startDate?.toISOString(),
      dto.targetDate ?? current.targetDate?.toISOString(),
    );
    const { budgetAmount, ...projectData } = dto;
    await this.prisma.$transaction(async (tx) => {
      await tx.project.update({
        where: { id, userId },
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
          where: { projectId: id, userId },
          orderBy: { createdAt: 'asc' },
        });
        if (budget)
          await tx.projectBudget.update({
            where: { id: budget.id, userId },
            data: { plannedAmount: budgetAmount },
          });
        else
          await tx.projectBudget.create({
            data: {
              userId,
              projectId: id,
              name: 'Project budget',
              plannedAmount: budgetAmount,
            },
          });
      }
    });
    return this.get(id, userId);
  }

  async complete(id: string, userId: string) {
    await this.requireProject(id, userId);
    await this.validateProjectCompletion(id, userId);
    await this.prisma.project.update({
      where: { id, userId },
      data: { status: 'completed' },
    });
    return this.get(id, userId);
  }

  async remove(id: string, userId: string) {
    await this.requireProject(id, userId);
    return this.prisma.project.update({
      where: { id, userId },
      data: { status: 'archived' },
    });
  }

  async createTask(
    projectId: string,
    dto: CreateProjectTaskDto,
    userId: string,
  ) {
    await this.requireProject(projectId, userId);
    return this.prisma.projectTask.create({
      data: {
        ...dto,
        status: 'pending',
        priority: this.normalizePriority(dto.priority ?? 'medium'),
        dueDate: dto.dueDate ? new Date(dto.dueDate) : undefined,
        completedAt: null,
        projectId,
        userId,
      },
    });
  }

  async getTasks(
    projectId: string,
    query: ProjectTaskQueryDto,
    userId: string,
  ) {
    await this.requireProject(projectId, userId);
    const tasks = await this.prisma.projectTask.findMany({
      where: {
        projectId,
        userId,
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
    return tasks.map((task) => this.withCurrentTaskStatus(task));
  }

  async updateTask(
    taskId: string,
    dto: UpdateProjectTaskDto,
    userId: string,
    projectId?: string,
  ) {
    await this.requireTask(taskId, userId, projectId);
    const status = dto.status
      ? this.normalizeTaskStatus(dto.status)
      : undefined;
    const task = await this.prisma.projectTask.update({
      where: { id: taskId, userId },
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
    return this.withCurrentTaskStatus(task);
  }

  async deleteTask(taskId: string, userId: string, projectId?: string) {
    await this.requireTask(taskId, userId, projectId);
    return this.prisma.projectTask.update({
      where: { id: taskId, userId },
      data: { status: 'cancelled', completedAt: null },
    });
  }

  async summary(userId: string) {
    const projects = await this.prisma.project.findMany({
      where: { userId },
      include: {
        tasks: { where: { userId } },
        budgets: { where: { userId } },
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

  async getBudgets(projectId: string, userId: string) {
    await this.requireProject(projectId, userId);
    return this.prisma.projectBudget.findMany({
      where: { projectId, userId },
      orderBy: { createdAt: 'asc' },
    });
  }

  async createBudget(
    projectId: string,
    dto: CreateProjectBudgetDto,
    userId: string,
  ) {
    await this.requireProject(projectId, userId);
    return this.prisma.projectBudget.create({
      data: { ...dto, projectId, userId },
    });
  }

  async updateBudget(
    projectId: string,
    budgetId: string,
    dto: UpdateProjectBudgetDto,
    userId: string,
  ) {
    const budget = await this.prisma.projectBudget.findFirst({
      where: { id: budgetId, projectId, userId },
    });
    if (!budget) throw new NotFoundException('Project budget not found');
    return this.prisma.projectBudget.update({
      where: { id: budgetId, userId },
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
      nextTask: nextTask ? this.withCurrentTaskStatus(nextTask) : null,
      stats: { totalTasks: activeTasks.length, completedTasks },
      // Existing frontend aliases.
      progress: progressPercent,
      budget: budgetAmount,
      ...(includeTasks
        ? {
            tasks: tasks.map((task) => this.withCurrentTaskStatus(task)),
            budgets,
          }
        : {}),
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

  private withCurrentTaskStatus<T extends { status: string }>(task: T) {
    return { ...task, status: this.normalizeTaskStatus(task.status) };
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

  private async validateProjectCompletion(id: string, userId: string) {
    const tasks = await this.prisma.projectTask.findMany({
      where: { projectId: id, userId, status: { not: 'cancelled' } },
      select: { status: true },
    });
    if (!tasks.length)
      throw new BadRequestException(
        'Project must have at least one non-cancelled task to be completed',
      );
    if (tasks.some((task) => !completedStatuses.includes(task.status)))
      throw new BadRequestException(
        'All non-cancelled project tasks must be completed',
      );
  }

  private async requireProject(id: string, userId: string) {
    const project = await this.prisma.project.findFirst({
      where: { id, userId },
    });
    if (!project) throw new NotFoundException('Project not found');
    return project;
  }

  private async requireTask(id: string, userId: string, projectId?: string) {
    const task = await this.prisma.projectTask.findFirst({
      where: { id, projectId, userId },
    });
    if (!task) throw new NotFoundException('Project task not found');
    return task;
  }
}
