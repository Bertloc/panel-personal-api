import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
} from '@nestjs/common';
import {
  CreateProjectBudgetDto,
  CreateProjectDto,
  CreateProjectTaskDto,
  UpdateProjectBudgetDto,
  UpdateProjectDto,
  UpdateProjectTaskDto,
} from './projects.dto';
import { ProjectsService } from './projects.service';
@Controller('api/projects')
export class ProjectsController {
  constructor(private readonly service: ProjectsService) {}
  @Get() getAll() {
    return this.service.getAll();
  }
  @Post() create(@Body() dto: CreateProjectDto) {
    return this.service.create(dto);
  }
  @Get(':id') get(@Param('id') id: string) {
    return this.service.get(id);
  }
  @Patch(':id') update(@Param('id') id: string, @Body() dto: UpdateProjectDto) {
    return this.service.update(id, dto);
  }
  @Post(':id/tasks') createTask(
    @Param('id') id: string,
    @Body() dto: CreateProjectTaskDto,
  ) {
    return this.service.createTask(id, dto);
  }
  @Get(':id/tasks') getTasks(@Param('id') id: string) {
    return this.service.getTasks(id);
  }
  @Patch(':id/tasks/:taskId') updateTask(
    @Param('id') id: string,
    @Param('taskId') taskId: string,
    @Body() dto: UpdateProjectTaskDto,
  ) {
    return this.service.updateTask(id, taskId, dto);
  }
  @Delete(':id/tasks/:taskId') deleteTask(
    @Param('id') id: string,
    @Param('taskId') taskId: string,
  ) {
    return this.service.deleteTask(id, taskId);
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
