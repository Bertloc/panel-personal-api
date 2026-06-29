import { Type } from 'class-transformer';
import {
  IsDateString,
  IsIn,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  Min,
  MinLength,
} from 'class-validator';

export class CreateDebtDto {
  @IsString() @MinLength(1) name!: string;
  @Type(() => Number) @IsNumber() @Min(0) initialAmount!: number;
  @Type(() => Number) @IsNumber() @Min(0) minimumPayment!: number;
  @Type(() => Number) @IsInt() @Min(1) @Max(31) paymentDay!: number;
  @IsOptional() @Type(() => Number) @IsNumber() @Min(0) interestRate?: number;
  @IsOptional() @IsIn(['active', 'paid', 'paused']) status?: string;
}

export class UpdateDebtDto {
  @IsOptional() @IsString() @MinLength(1) name?: string;
  @IsOptional() @Type(() => Number) @IsNumber() @Min(0) currentAmount?: number;
  @IsOptional() @Type(() => Number) @IsNumber() @Min(0) minimumPayment?: number;
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(31)
  paymentDay?: number;
  @IsOptional() @Type(() => Number) @IsNumber() @Min(0) interestRate?: number;
  @IsOptional() @IsIn(['active', 'paid', 'paused']) status?: string;
}

export class CreateDebtPaymentDto {
  @Type(() => Number) @IsNumber() @Min(0.01) amount!: number;
  @IsDateString() paymentDate!: string;
  @IsIn(['required', 'extra', 'adjustment']) paymentType!: string;
  @IsOptional() @IsString() note?: string;
}
