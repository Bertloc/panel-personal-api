import { Transform, TransformFnParams, Type } from 'class-transformer';
import {
  IsBoolean,
  IsDateString,
  IsIn,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Min,
  MinLength,
} from 'class-validator';
export const PROJECT_STATUS = [
  'planned',
  'active',
  'paused',
  'completed',
  'cancelled',
  'archived',
];
export const TASK_STATUS = [
  'pending',
  'in_progress',
  'blocked',
  'completed',
  'cancelled',
  // Temporary compatibility with the original frontend/data.
  'todo',
  'done',
];
export const PRIORITY = ['low', 'medium', 'high', 'urgent', 'critical'];

const QueryBoolean = () =>
  Transform(({ value }: TransformFnParams): unknown => {
    const input: unknown = value;
    return input === 'true' ? true : input === 'false' ? false : input;
  });

export class ProjectQueryDto {
  @IsOptional() @IsIn(PROJECT_STATUS) status?: string;
  @IsOptional() @IsIn(PRIORITY) priority?: string;
  @IsOptional() @IsString() category?: string;
  @IsOptional() @QueryBoolean() @IsBoolean() includeArchived?: boolean;
  @IsOptional() @QueryBoolean() @IsBoolean() includeTasks?: boolean;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) limit?: number;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) page?: number;
}

export class ProjectTaskQueryDto {
  @IsOptional() @IsIn(TASK_STATUS) status?: string;
  @IsOptional() @IsIn(PRIORITY) priority?: string;
  @IsOptional() @QueryBoolean() @IsBoolean() includeCancelled?: boolean;
}

export class CreateProjectDto {
  @IsString() @MinLength(1) name!: string;
  @IsOptional() @IsString() description?: string;
  @IsOptional() @IsString() category?: string;
  @IsOptional() @IsIn(PROJECT_STATUS) status?: string;
  @IsOptional() @IsIn(PRIORITY) priority?: string;
  @IsOptional() @IsDateString() startDate?: string;
  @IsOptional() @IsDateString() targetDate?: string;
  @IsOptional() @IsBoolean() consumesMoney?: boolean;
  @IsOptional() @Type(() => Number) @IsNumber() @Min(0) budgetAmount?: number;
}
export class UpdateProjectDto {
  @IsOptional() @IsString() @MinLength(1) name?: string;
  @IsOptional() @IsString() description?: string;
  @IsOptional() @IsString() category?: string;
  @IsOptional() @IsIn(PROJECT_STATUS) status?: string;
  @IsOptional() @IsIn(PRIORITY) priority?: string;
  @IsOptional() @IsDateString() startDate?: string;
  @IsOptional() @IsDateString() targetDate?: string;
  @IsOptional() @IsBoolean() consumesMoney?: boolean;
  @IsOptional() @Type(() => Number) @IsNumber() @Min(0) budgetAmount?: number;
}
export class CreateProjectTaskDto {
  @IsString() @MinLength(1) title!: string;
  @IsOptional() @IsString() description?: string;
  @IsOptional() @IsIn(TASK_STATUS) status?: string;
  @IsOptional() @IsIn(PRIORITY) priority?: string;
  @IsOptional() @IsDateString() dueDate?: string;
  @IsOptional() @Type(() => Number) @IsNumber() @Min(0) estimatedCost?: number;
  @IsOptional() @Type(() => Number) @IsNumber() @Min(0) actualCost?: number;
  @IsOptional() @Type(() => Number) @IsInt() @Min(0) order?: number;
}
export class UpdateProjectTaskDto {
  @IsOptional() @IsString() @MinLength(1) title?: string;
  @IsOptional() @IsString() description?: string;
  @IsOptional() @IsIn(TASK_STATUS) status?: string;
  @IsOptional() @IsIn(PRIORITY) priority?: string;
  @IsOptional() @IsDateString() dueDate?: string;
  @IsOptional() @Type(() => Number) @IsNumber() @Min(0) estimatedCost?: number;
  @IsOptional() @Type(() => Number) @IsNumber() @Min(0) actualCost?: number;
  @IsOptional() @Type(() => Number) @IsInt() @Min(0) order?: number;
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
