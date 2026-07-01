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
export class CreateSavingsGoalDto {
  @IsString() @MinLength(1) name!: string;
  @Type(() => Number) @IsNumber() @Min(0.01) targetAmount!: number;
  @IsOptional() @Type(() => Number) @IsNumber() @Min(0) currentAmount?: number;
  @IsOptional() @IsDateString() targetDate?: string;
  @IsOptional() @IsIn(['low', 'medium', 'high', 'urgent']) priority?: string;
  @IsOptional()
  @IsIn(['active', 'completed', 'paused', 'cancelled'])
  status?: string;
  @IsOptional() @IsString() notes?: string;
}
export class UpdateSavingsGoalDto {
  @IsOptional() @IsString() @MinLength(1) name?: string;
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0.01)
  targetAmount?: number;
  @IsOptional() @Type(() => Number) @IsNumber() @Min(0) currentAmount?: number;
  @IsOptional() @IsDateString() targetDate?: string;
  @IsOptional() @IsIn(['low', 'medium', 'high', 'urgent']) priority?: string;
  @IsOptional()
  @IsIn(['active', 'completed', 'paused', 'cancelled'])
  status?: string;
  @IsOptional() @IsString() notes?: string;
}
export class CreateSavingsMovementDto {
  @Type(() => Number) @IsNumber() @Min(0.01) amount!: number;
  @IsDateString() movementDate!: string;
  @IsOptional() @IsIn(['deposit', 'withdrawal', 'adjustment']) type?: string;
  @IsOptional()
  @IsIn(['deposit', 'withdrawal', 'adjustment'])
  movementType?: string;
  @IsOptional() @IsString() note?: string;
}

export class UpdateSavingsMovementDto {
  @IsOptional() @Type(() => Number) @IsNumber() @Min(0.01) amount?: number;
  @IsOptional() @IsDateString() movementDate?: string;
  @IsOptional() @IsIn(['deposit', 'withdrawal', 'adjustment']) type?: string;
  @IsOptional()
  @IsIn(['deposit', 'withdrawal', 'adjustment'])
  movementType?: string;
  @IsOptional() @IsString() note?: string;
}
