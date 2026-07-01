import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsDateString,
  IsIn,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Min,
  MinLength,
  ValidateNested,
} from 'class-validator';

export class CreateBudgetPeriodDto {
  @IsString() @MinLength(1) name!: string;
  @IsIn(['weekly', 'biweekly', 'monthly', 'yearly', 'custom'])
  periodType!: string;
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

export class CurrentBudgetLimitDto {
  @IsUUID() categoryId!: string;
  @Type(() => Number) @IsNumber() @Min(0.01) amount!: number;
}

export class CreateCurrentBudgetDto {
  @IsString() @MinLength(1) name!: string;
  @IsIn(['weekly', 'biweekly', 'monthly', 'custom']) periodType!: string;
  @IsDateString() startDate!: string;
  @IsDateString() endDate!: string;
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => CurrentBudgetLimitDto)
  limits!: CurrentBudgetLimitDto[];
}

export class UpdateCurrentBudgetDto {
  @IsOptional() @IsString() @MinLength(1) name?: string;
  @IsOptional()
  @IsIn(['weekly', 'biweekly', 'monthly', 'custom'])
  periodType?: string;
  @IsOptional() @IsDateString() startDate?: string;
  @IsOptional() @IsDateString() endDate?: string;
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CurrentBudgetLimitDto)
  limits?: CurrentBudgetLimitDto[];
}
