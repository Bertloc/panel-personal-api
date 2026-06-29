import { Type } from 'class-transformer';
import { IsIn, IsInt, IsNumber, IsOptional, Max, Min } from 'class-validator';

export class UpdateSettingsDto {
  @IsOptional() @IsIn(['MXN', 'USD']) currency?: string;
  @IsOptional()
  @IsIn(['weekly', 'biweekly', 'monthly'])
  incomeFrequency?: string;
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
