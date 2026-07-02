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
@Controller('api/projects')
export class ProjectsController {
  constructor(private readonly service: ProjectsService) {}
  @Get() getAll(@Query() query: ProjectQueryDto) {
    return this.service.getAll(query);
  }
  @Post() create(@Body() dto: CreateProjectDto) {
    return this.service.create(dto);
  }
  @Get('summary') summary() {
    return this.service.summary();
  }
  @Patch('tasks/:taskId') updateTaskById(
    @Param('taskId') taskId: string,
    @Body() dto: UpdateProjectTaskDto,
  ) {
    return this.service.updateTask(taskId, dto);
  }
  @Delete('tasks/:taskId') deleteTaskById(@Param('taskId') taskId: string) {
    return this.service.deleteTask(taskId);
  }
  @Get(':id') get(@Param('id') id: string) {
    return this.service.get(id);
  }
  @Patch(':id') update(@Param('id') id: string, @Body() dto: UpdateProjectDto) {
    return this.service.update(id, dto);
  }
  @Delete(':id') remove(@Param('id') id: string) {
    return this.service.remove(id);
  }
  @Post(':id/tasks') createTask(
    @Param('id') id: string,
    @Body() dto: CreateProjectTaskDto,
  ) {
    return this.service.createTask(id, dto);
  }
  @Get(':id/tasks') getTasks(
    @Param('id') id: string,
    @Query() query: ProjectTaskQueryDto,
  ) {
    return this.service.getTasks(id, query);
  }
  @Patch(':id/tasks/:taskId') updateTask(
    @Param('id') id: string,
    @Param('taskId') taskId: string,
    @Body() dto: UpdateProjectTaskDto,
  ) {
    return this.service.updateTask(taskId, dto, id);
  }
  @Delete(':id/tasks/:taskId') deleteTask(
    @Param('id') id: string,
    @Param('taskId') taskId: string,
  ) {
    return this.service.deleteTask(taskId, id);
  }
  @Get(':id/budgets') getBudgets(@Param('id') id: string) {
    return this.service.getBudgets(id);
  }
  @Post(':id/budgets') createBudget(
    @Param('id') id: string,
    @Body() dto: CreateProjectBudgetDto,
  ) {
    return this.service.createBudget(id, dto);
  }
  @Patch(':id/budgets/:budgetId') updateBudget(
    @Param('id') id: string,
    @Param('budgetId') budgetId: string,
    @Body() dto: UpdateProjectBudgetDto,
  ) {
    return this.service.updateBudget(id, budgetId, dto);
  }
}
