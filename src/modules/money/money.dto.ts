import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsDateString,
  IsIn,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Min,
  MinLength,
} from 'class-validator';

const CATEGORY_TYPES = ['expense', 'saving', 'debt', 'income_adjustment'];
const EXPENSE_SOURCES = ['manual', 'recurrent', 'imported'];
const PAYMENT_METHODS = ['cash', 'debit', 'credit', 'transfer', 'other'];

export class CreateExpenseCategoryDto {
  @IsString() @MinLength(1) name!: string;
  @IsString() @MinLength(1) slug!: string;
  @IsIn(CATEGORY_TYPES) type!: string;
  @IsOptional() @IsBoolean() isFixed?: boolean;
  @IsOptional() @IsBoolean() isActive?: boolean;
  @IsOptional() @IsString() color?: string;
  @IsOptional() @IsString() icon?: string;
}

export class UpdateExpenseCategoryDto {
  @IsOptional() @IsString() @MinLength(1) name?: string;
  @IsOptional() @IsString() @MinLength(1) slug?: string;
  @IsOptional() @IsIn(CATEGORY_TYPES) type?: string;
  @IsOptional() @IsBoolean() isFixed?: boolean;
  @IsOptional() @IsBoolean() isActive?: boolean;
  @IsOptional() @IsString() color?: string;
  @IsOptional() @IsString() icon?: string;
}

export class CreateExpenseDto {
  @IsUUID() categoryId!: string;
  @Type(() => Number) @IsNumber() @Min(0.01) amount!: number;
  @IsDateString() expenseDate!: string;
  @IsIn(EXPENSE_SOURCES) source!: string;
  @IsOptional() @IsIn(PAYMENT_METHODS) paymentMethod?: string;
  @IsOptional() @IsString() note?: string;
  @IsOptional() @IsUUID() projectId?: string;
}

export class UpdateExpenseDto {
  @IsOptional() @IsUUID() categoryId?: string;
  @IsOptional() @Type(() => Number) @IsNumber() @Min(0.01) amount?: number;
  @IsOptional() @IsDateString() expenseDate?: string;
  @IsOptional() @IsIn(EXPENSE_SOURCES) source?: string;
  @IsOptional() @IsIn(PAYMENT_METHODS) paymentMethod?: string;
  @IsOptional() @IsString() note?: string;
  @IsOptional() @IsUUID() projectId?: string;
}

export class ExpenseFiltersDto {
  @IsOptional() @IsDateString() startDate?: string;
  @IsOptional() @IsDateString() endDate?: string;
  @IsOptional() @IsUUID() categoryId?: string;
  @IsOptional() @IsIn(EXPENSE_SOURCES) source?: string;
}
