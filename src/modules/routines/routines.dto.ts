import { Transform, TransformFnParams, Type } from 'class-transformer';
import {
  ArrayUnique,
  IsArray,
  IsBoolean,
  IsDateString,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  Max,
  Min,
} from 'class-validator';

const ROUTINE_STATUSES = ['active', 'paused', 'archived'];
const PRIORITIES = ['low', 'medium', 'high', 'essential'];
const LOG_STATUSES = ['pending', 'done', 'skipped', 'missed'];
const toBoolean = ({ value }: TransformFnParams): unknown => {
  const input = value as unknown;
  return input === 'true' ? true : input === 'false' ? false : input;
};

class DaysOfWeekDto {
  @IsOptional()
  @IsArray()
  @ArrayUnique()
  @Type(() => Number)
  @IsInt({ each: true })
  @Min(0, { each: true })
  @Max(6, { each: true })
  daysOfWeek?: number[];
}

export class CreateRoutineDto extends DaysOfWeekDto {
  @IsString() @Matches(/\S/) name!: string;
  @IsOptional() @IsString() description?: string;
  @IsOptional() @IsIn(ROUTINE_STATUSES) status?: string;
  @IsOptional() @IsIn(PRIORITIES) priority?: string;
}

export class UpdateRoutineDto extends DaysOfWeekDto {
  @IsOptional() @IsString() @Matches(/\S/) name?: string;
  @IsOptional() @IsString() description?: string;
  @IsOptional() @IsIn(ROUTINE_STATUSES) status?: string;
  @IsOptional() @IsIn(PRIORITIES) priority?: string;
}

export class RoutineQueryDto {
  @IsOptional() @IsIn(ROUTINE_STATUSES) status?: string;
  @IsOptional() @Transform(toBoolean) @IsBoolean() includeItems?: boolean;
  @IsOptional() @Transform(toBoolean) @IsBoolean() includeArchived?: boolean;
}

export class CreateRoutineItemDto extends DaysOfWeekDto {
  @IsString() @Matches(/\S/) title!: string;
  @IsOptional() @IsString() description?: string;
  @IsOptional() @IsIn(PRIORITIES) priority?: string;
  @IsOptional() @IsBoolean() isRequired?: boolean;
  @IsOptional() @Type(() => Number) @IsInt() @Min(0) order?: number;
}

export class UpdateRoutineItemDto extends DaysOfWeekDto {
  @IsOptional() @IsString() @Matches(/\S/) title?: string;
  @IsOptional() @IsString() description?: string;
  @IsOptional() @IsIn(PRIORITIES) priority?: string;
  @IsOptional() @IsBoolean() isRequired?: boolean;
  @IsOptional() @Type(() => Number) @IsInt() @Min(0) order?: number;
  @IsOptional() @IsBoolean() isActive?: boolean;
}

export class CreateRoutineLogDto {
  @IsUUID() routineId!: string;
  @IsUUID() routineItemId!: string;
  @IsDateString() logDate!: string;
  @IsIn(LOG_STATUSES) status!: string;
  @IsOptional() @IsString() note?: string;
}

export class UpdateRoutineLogDto {
  @IsOptional() @IsIn(LOG_STATUSES) status?: string;
  @IsOptional() @IsString() note?: string;
}

export class RoutineTodayQueryDto {
  @IsOptional() @IsDateString() date?: string;
}

export class RoutineHistoryQueryDto {
  @IsOptional() @IsDateString() startDate?: string;
  @IsOptional() @IsDateString() endDate?: string;
  @IsOptional() @IsUUID() routineId?: string;
}

export class RoutineSummaryQueryDto {
  @IsOptional() @IsDateString() date?: string;
}
