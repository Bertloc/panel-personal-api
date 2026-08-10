import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
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
import { ProjectsService } from './projects.service';
import { CurrentUserId } from '../auth/auth.decorator';
@Controller('api/projects')
export class ProjectsController {
  constructor(private readonly service: ProjectsService) {}
  @Get() getAll(
    @Query() query: ProjectQueryDto,
    @CurrentUserId() userId: string,
  ) {
    return this.service.getAll(query, userId);
  }
  @Post() create(
    @Body() dto: CreateProjectDto,
    @CurrentUserId() userId: string,
  ) {
    return this.service.create(dto, userId);
  }
  @Get('summary') summary(@CurrentUserId() userId: string) {
    return this.service.summary(userId);
  }
  @Patch('tasks/:taskId') updateTaskById(
    @Param('taskId') taskId: string,
    @Body() dto: UpdateProjectTaskDto,
    @CurrentUserId() userId: string,
  ) {
    return this.service.updateTask(taskId, dto, userId);
  }
  @Delete('tasks/:taskId') deleteTaskById(
    @Param('taskId') taskId: string,
    @CurrentUserId() userId: string,
  ) {
    return this.service.deleteTask(taskId, userId);
  }
  @Get(':id') get(@Param('id') id: string, @CurrentUserId() userId: string) {
    return this.service.get(id, userId);
  }
  @Patch(':id') update(
    @Param('id') id: string,
    @Body() dto: UpdateProjectDto,
    @CurrentUserId() userId: string,
  ) {
    return this.service.update(id, dto, userId);
  }
  @Post(':id/complete') complete(
    @Param('id') id: string,
    @CurrentUserId() userId: string,
  ) {
    return this.service.complete(id, userId);
  }
  @Delete(':id') remove(
    @Param('id') id: string,
    @CurrentUserId() userId: string,
  ) {
    return this.service.remove(id, userId);
  }
  @Post(':id/tasks') createTask(
    @Param('id') id: string,
    @Body() dto: CreateProjectTaskDto,
    @CurrentUserId() userId: string,
  ) {
    return this.service.createTask(id, dto, userId);
  }
  @Get(':id/tasks') getTasks(
    @Param('id') id: string,
    @Query() query: ProjectTaskQueryDto,
    @CurrentUserId() userId: string,
  ) {
    return this.service.getTasks(id, query, userId);
  }
  @Patch(':id/tasks/:taskId') updateTask(
    @Param('id') id: string,
    @Param('taskId') taskId: string,
    @Body() dto: UpdateProjectTaskDto,
    @CurrentUserId() userId: string,
  ) {
    return this.service.updateTask(taskId, dto, userId, id);
  }
  @Delete(':id/tasks/:taskId') deleteTask(
    @Param('id') id: string,
    @Param('taskId') taskId: string,
    @CurrentUserId() userId: string,
  ) {
    return this.service.deleteTask(taskId, userId, id);
  }
  @Get(':id/budgets') getBudgets(
    @Param('id') id: string,
    @CurrentUserId() userId: string,
  ) {
    return this.service.getBudgets(id, userId);
  }
  @Post(':id/budgets') createBudget(
    @Param('id') id: string,
    @Body() dto: CreateProjectBudgetDto,
    @CurrentUserId() userId: string,
  ) {
    return this.service.createBudget(id, dto, userId);
  }
  @Patch(':id/budgets/:budgetId') updateBudget(
    @Param('id') id: string,
    @Param('budgetId') budgetId: string,
    @Body() dto: UpdateProjectBudgetDto,
    @CurrentUserId() userId: string,
  ) {
    return this.service.updateBudget(id, budgetId, dto, userId);
  }
}
