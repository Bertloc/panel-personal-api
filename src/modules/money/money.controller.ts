import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { MoneyService } from './money.service';
import {
  CategoryFiltersDto,
  CreateExpenseCategoryDto,
  CreateExpenseDto,
  ExpenseFiltersDto,
  UpdateExpenseCategoryDto,
  UpdateExpenseDto,
} from './money.dto';
import { CurrentUserId } from '../auth/auth.decorator';

@Controller('api/money')
export class MoneyController {
  constructor(private readonly moneyService: MoneyService) {}

  @Get('categories')
  getCategories(
    @Query() filters: CategoryFiltersDto,
    @CurrentUserId() userId: string,
  ) {
    return this.moneyService.getCategories(filters, userId);
  }

  @Post('categories')
  createCategory(
    @Body() dto: CreateExpenseCategoryDto,
    @CurrentUserId() userId: string,
  ) {
    return this.moneyService.createCategory(dto, userId);
  }

  @Patch('categories/:id')
  updateCategory(
    @Param('id') id: string,
    @Body() dto: UpdateExpenseCategoryDto,
    @CurrentUserId() userId: string,
  ) {
    return this.moneyService.updateCategory(id, dto, userId);
  }

  @Delete('categories/:id')
  deleteCategory(@Param('id') id: string, @CurrentUserId() userId: string) {
    return this.moneyService.deleteCategory(id, userId);
  }

  @Get('expenses')
  getExpenses(
    @Query() filters: ExpenseFiltersDto,
    @CurrentUserId() userId: string,
  ) {
    return this.moneyService.getExpenses(filters, userId);
  }

  @Get('expenses/:id')
  getExpense(@Param('id') id: string, @CurrentUserId() userId: string) {
    return this.moneyService.getExpense(id, userId);
  }

  @Post('expenses')
  createExpense(
    @Body() dto: CreateExpenseDto,
    @CurrentUserId() userId: string,
  ) {
    return this.moneyService.createExpense(dto, userId);
  }

  @Patch('expenses/:id')
  updateExpense(
    @Param('id') id: string,
    @Body() dto: UpdateExpenseDto,
    @CurrentUserId() userId: string,
  ) {
    return this.moneyService.updateExpense(id, dto, userId);
  }

  @Delete('expenses/:id')
  deleteExpense(@Param('id') id: string, @CurrentUserId() userId: string) {
    return this.moneyService.deleteExpense(id, userId);
  }
}
