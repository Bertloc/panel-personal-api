import { Type } from 'class-transformer';
import {
  IsIn,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Length,
  Max,
  Min,
} from 'class-validator';
import { BUDGET_MODES, INCOME_FREQUENCIES } from '../../common';

export class UpdateSettingsDto {
  @IsOptional() @IsString() @Length(3, 3) currency?: string;
  @IsOptional()
  @IsIn(INCOME_FREQUENCIES)
  incomeFrequency?: string;
  @IsOptional() @IsIn(BUDGET_MODES) budgetMode?: string;
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  defaultFoodBudget?: number;
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  dailyTransportEstimate?: number;
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(31)
  debtPaymentDay?: number;
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(31)
  gymPaymentDay?: number;
}
