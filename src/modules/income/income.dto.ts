import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsDateString,
  IsIn,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Matches,
  Max,
  Min,
  IsUUID,
} from 'class-validator';
import { INCOME_FREQUENCIES } from '../../common';

export class CreateIncomeSourceDto {
  @IsString() @Matches(/\S/) name!: string;
  @Type(() => Number) @IsNumber() @Min(0.01) amount!: number;
  @IsIn(INCOME_FREQUENCIES) frequency!: string;
  @IsOptional() @IsDateString() nextPaymentDate?: string;
  @IsOptional() @IsBoolean() isFixed?: boolean;
}

export class UpdateIncomeSourceDto {
  @IsOptional() @IsString() @Matches(/\S/) name?: string;
  @IsOptional() @Type(() => Number) @IsNumber() @Min(0.01) amount?: number;
  @IsOptional() @IsIn(INCOME_FREQUENCIES) frequency?: string;
  @IsOptional() @IsDateString() nextPaymentDate?: string;
  @IsOptional() @IsBoolean() isFixed?: boolean;
  @IsOptional() @IsBoolean() isActive?: boolean;
}

const INCOME_EVENT_TYPES = ['regular', 'extra', 'adjustment', 'other'];

export class CreateIncomeEventDto {
  @IsOptional() @IsUUID() sourceId?: string;
  @Type(() => Number) @IsNumber() @Min(0.01) amount!: number;
  @IsDateString() incomeDate!: string;
  @IsOptional() @IsIn(INCOME_EVENT_TYPES) type?: string;
  @IsOptional() @IsString() note?: string;
}

export class UpdateIncomeEventDto {
  @IsOptional() @IsUUID() sourceId?: string;
  @IsOptional() @Type(() => Number) @IsNumber() @Min(0.01) amount?: number;
  @IsOptional() @IsDateString() incomeDate?: string;
  @IsOptional() @IsIn(INCOME_EVENT_TYPES) type?: string;
  @IsOptional() @IsString() note?: string;
}

export class IncomeEventsQueryDto {
  @IsOptional() @IsUUID() sourceId?: string;
  @IsOptional() @IsDateString() startDate?: string;
  @IsOptional() @IsDateString() endDate?: string;
  @IsOptional() @IsIn(INCOME_EVENT_TYPES) type?: string;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(100) limit?: number;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) page?: number;
}
