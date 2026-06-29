import { Type } from 'class-transformer';
import {
  IsDateString,
  IsIn,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Min,
  MinLength,
} from 'class-validator';

export class CreateBudgetPeriodDto {
  @IsString() @MinLength(1) name!: string;
  @IsIn(['weekly', 'biweekly', 'monthly', 'yearly']) periodType!: string;
  @IsDateString() startDate!: string;
  @IsDateString() endDate!: string;
  @IsOptional() @Type(() => Number) @IsNumber() @Min(0) expectedIncome?: number;
  @IsIn(['planned', 'active', 'closed']) status!: string;
}

export class CreateBudgetLimitDto {
  @IsUUID() budgetPeriodId!: string;
  @IsUUID() categoryId!: string;
  @Type(() => Number) @IsNumber() @Min(0) limitAmount!: number;
}

export class UpdateBudgetLimitDto {
  @Type(() => Number) @IsNumber() @Min(0) limitAmount!: number;
}
