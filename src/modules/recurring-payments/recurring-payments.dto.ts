import { Transform, Type } from 'class-transformer';
import {
  IsBoolean,
  IsDateString,
  IsIn,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  Max,
  Min,
} from 'class-validator';

const FREQUENCIES = [
  'daily',
  'weekly',
  'biweekly',
  'monthly',
  'yearly',
  'custom',
];

export class RecurringPaymentFiltersDto {
  @IsOptional()
  @Transform(({ value }) => value === true || value === 'true')
  @IsBoolean()
  includeInactive?: boolean;
}

export class CreateRecurringPaymentDto {
  @IsString() @Matches(/\S/) name!: string;
  @Type(() => Number) @IsNumber() @Min(0.01) amount!: number;
  @IsIn(FREQUENCIES) frequency!: string;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(31) dueDay?: number;
  @IsOptional() @IsDateString() nextDueDate?: string;
  @IsOptional() @IsUUID() categoryId?: string;
  @IsOptional() @IsBoolean() isFixed?: boolean;
  @IsOptional() @IsString() notes?: string;
}

export class UpdateRecurringPaymentDto {
  @IsOptional() @IsString() @Matches(/\S/) name?: string;
  @IsOptional() @Type(() => Number) @IsNumber() @Min(0.01) amount?: number;
  @IsOptional() @IsIn(FREQUENCIES) frequency?: string;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(31) dueDay?: number;
  @IsOptional() @IsDateString() nextDueDate?: string;
  @IsOptional() @IsUUID() categoryId?: string;
  @IsOptional() @IsBoolean() isFixed?: boolean;
  @IsOptional() @IsBoolean() isActive?: boolean;
  @IsOptional() @IsString() notes?: string;
}
