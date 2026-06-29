import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { DEFAULT_USER_ID } from '../../common';
import { PrismaService } from '../../prisma/prisma.service';
import {
  CreateProjectBudgetDto,
  CreateProjectDto,
  CreateProjectTaskDto,
  UpdateProjectBudgetDto,
  UpdateProjectDto,
  UpdateProjectTaskDto,
} from './projects.dto';
@Injectable()
export class ProjectsService {
  constructor(private readonly prisma: PrismaService) {}
  async getAll() {
    const projects = await this.prisma.project.findMany({
      where: { userId: DEFAULT_USER_ID },
      include: {
        tasks: { where: { userId: DEFAULT_USER_ID }, select: { status: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
    return projects.map((project) => this.withProgress(project));
  }
  async get(id: string) {
    const project = await this.prisma.project.findFirst({
      where: { id, userId: DEFAULT_USER_ID },
      include: {
        tasks: { where: { userId: DEFAULT_USER_ID } },
        budgets: { where: { userId: DEFAULT_USER_ID } },
      },
    });
    if (!project) throw new NotFoundException('Project not found');
    return this.withProgress(project);
  }
  create(dto: CreateProjectDto) {
    this.validateDates(dto.startDate, dto.targetDate);
    return this.prisma.project.create({
      data: {
        ...dto,
        status: dto.status ?? 'planned',
        startDate: dto.startDate ? new Date(dto.startDate) : undefined,
        targetDate: dto.targetDate ? new Date(dto.targetDate) : undefined,
        userId: DEFAULT_USER_ID,
      },
    });
  }
  async update(id: string, dto: UpdateProjectDto) {
    const current = await this.get(id);
    this.validateDates(
      dto.startDate ?? current.startDate?.toISOString(),
      dto.targetDate ?? current.targetDate?.toISOString(),
    );
    return this.prisma.project.update({
      where: { id, userId: DEFAULT_USER_ID },
      data: {
        ...dto,
        startDate: dto.startDate ? new Date(dto.startDate) : undefined,
        targetDate: dto.targetDate ? new Date(dto.targetDate) : undefined,
      },
    });
  }
  async createTask(projectId: string, dto: CreateProjectTaskDto) {
    await this.requireProject(projectId);
    const status = dto.status ?? 'todo';
    return this.prisma.projectTask.create({
      data: {
        ...dto,
        status,
        dueDate: dto.dueDate ? new Date(dto.dueDate) : undefined,
        completedAt: status === 'done' ? new Date() : null,
        projectId,
        userId: DEFAULT_USER_ID,
      },
    });
  }
  async getTasks(projectId: string) {
    await this.requireProject(projectId);
    return this.prisma.projectTask.findMany({
      where: { projectId, userId: DEFAULT_USER_ID },
      orderBy: { createdAt: 'asc' },
    });
  }
  async updateTask(
    projectId: string,
    taskId: string,
    dto: UpdateProjectTaskDto,
  ) {
    await this.requireTask(projectId, taskId);
    return this.prisma.projectTask.update({
      where: { id: taskId, userId: DEFAULT_USER_ID },
      data: {
        ...dto,
        dueDate: dto.dueDate ? new Date(dto.dueDate) : undefined,
        completedAt: dto.status
          ? dto.status === 'done'
            ? new Date()
            : null
          : undefined,
      },
    });
  }
  async deleteTask(projectId: string, taskId: string) {
    await this.requireTask(projectId, taskId);
    return this.prisma.projectTask.delete({
      where: { id: taskId, userId: DEFAULT_USER_ID },
    });
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
  private withProgress<T extends { tasks: { status: string }[] }>(project: T) {
    const done = project.tasks.filter((task) => task.status === 'done').length;
    return {
      ...project,
      progress: project.tasks.length
        ? Math.round((done / project.tasks.length) * 100)
        : 0,
    };
  }
  private validateDates(start?: string, target?: string) {
    if (start && target && new Date(start) > new Date(target))
      throw new BadRequestException(
        'startDate must be before or equal to targetDate',
      );
  }
  private async requireProject(id: string) {
    const project = await this.prisma.project.findFirst({
      where: { id, userId: DEFAULT_USER_ID },
    });
    if (!project) throw new NotFoundException('Project not found');
    return project;
  }
  private async requireTask(projectId: string, id: string) {
    const task = await this.prisma.projectTask.findFirst({
      where: { id, projectId, userId: DEFAULT_USER_ID },
    });
    if (!task) throw new NotFoundException('Project task not found');
    return task;
  }
}
