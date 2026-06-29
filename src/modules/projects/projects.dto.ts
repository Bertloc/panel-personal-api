import { Type } from 'class-transformer';
import {
  IsDateString,
  IsIn,
  IsNumber,
  IsOptional,
  IsString,
  Min,
  MinLength,
} from 'class-validator';
const PROJECT_STATUS = [
  'planned',
  'active',
  'paused',
  'completed',
  'cancelled',
];
const TASK_STATUS = ['todo', 'in_progress', 'done', 'cancelled'];
const PRIORITY = ['low', 'medium', 'high', 'critical'];
export class CreateProjectDto {
  @IsString() @MinLength(1) name!: string;
  @IsOptional() @IsString() description?: string;
  @IsOptional() @IsIn(PROJECT_STATUS) status?: string;
  @IsIn(PRIORITY) priority!: string;
  @IsOptional() @IsDateString() startDate?: string;
  @IsOptional() @IsDateString() targetDate?: string;
}
export class UpdateProjectDto {
  @IsOptional() @IsString() @MinLength(1) name?: string;
  @IsOptional() @IsString() description?: string;
  @IsOptional() @IsIn(PROJECT_STATUS) status?: string;
  @IsOptional() @IsIn(PRIORITY) priority?: string;
  @IsOptional() @IsDateString() startDate?: string;
  @IsOptional() @IsDateString() targetDate?: string;
}
export class CreateProjectTaskDto {
  @IsString() @MinLength(1) title!: string;
  @IsOptional() @IsString() description?: string;
  @IsOptional() @IsIn(TASK_STATUS) status?: string;
  @IsIn(PRIORITY) priority!: string;
  @IsOptional() @IsDateString() dueDate?: string;
}
export class UpdateProjectTaskDto {
  @IsOptional() @IsString() @MinLength(1) title?: string;
  @IsOptional() @IsString() description?: string;
  @IsOptional() @IsIn(TASK_STATUS) status?: string;
  @IsOptional() @IsIn(PRIORITY) priority?: string;
  @IsOptional() @IsDateString() dueDate?: string;
}
export class CreateProjectBudgetDto {
  @IsString() @MinLength(1) name!: string;
  @Type(() => Number) @IsNumber() @Min(0) plannedAmount!: number;
  @IsOptional() @Type(() => Number) @IsNumber() @Min(0) spentAmount?: number;
  @IsOptional() @IsString() notes?: string;
}
export class UpdateProjectBudgetDto {
  @IsOptional() @IsString() @MinLength(1) name?: string;
  @IsOptional() @Type(() => Number) @IsNumber() @Min(0) plannedAmount?: number;
  @IsOptional() @Type(() => Number) @IsNumber() @Min(0) spentAmount?: number;
  @IsOptional() @IsString() notes?: string;
}
