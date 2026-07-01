import { Transform, Type } from 'class-transformer';
import {
  IsBoolean,
  IsDateString,
  IsIn,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  Min,
  MinLength,
} from 'class-validator';

const CATEGORY_TYPES = [
  'expense',
  'saving',
  'debt',
  'income',
  'project',
  'income_adjustment',
];
const CATEGORY_PRIORITIES = ['low', 'medium', 'high', 'essential'];
const EXPENSE_SOURCES = ['manual', 'recurrent', 'imported'];
const PAYMENT_METHODS = ['cash', 'debit', 'credit', 'transfer', 'other'];

export class CreateExpenseCategoryDto {
  @IsString() @Matches(/\S/) name!: string;
  @IsOptional() @IsString() @MinLength(1) slug?: string;
  @IsIn(CATEGORY_TYPES) type!: string;
  @IsOptional() @IsIn(CATEGORY_PRIORITIES) priority?: string;
  @IsOptional() @IsBoolean() isFixed?: boolean;
  @IsOptional() @IsBoolean() isActive?: boolean;
  @IsOptional() @IsString() color?: string;
  @IsOptional() @IsString() icon?: string;
}

export class UpdateExpenseCategoryDto {
  @IsOptional() @IsString() @Matches(/\S/) name?: string;
  @IsOptional() @IsString() @MinLength(1) slug?: string;
  @IsOptional() @IsIn(CATEGORY_TYPES) type?: string;
  @IsOptional() @IsIn(CATEGORY_PRIORITIES) priority?: string;
  @IsOptional() @IsBoolean() isFixed?: boolean;
  @IsOptional() @IsBoolean() isActive?: boolean;
  @IsOptional() @IsString() color?: string;
  @IsOptional() @IsString() icon?: string;
}

export class CategoryFiltersDto {
  @IsOptional() @IsIn(CATEGORY_TYPES) type?: string;
  @IsOptional()
  @Transform(({ value }) => value === true || value === 'true')
  @IsBoolean()
  includeInactive?: boolean;
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
