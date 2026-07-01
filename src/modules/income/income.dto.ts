import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsDateString,
  IsIn,
  IsNumber,
  IsOptional,
  IsString,
  Matches,
  Min,
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
