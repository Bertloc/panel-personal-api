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
  CreateExpenseCategoryDto,
  CreateExpenseDto,
  ExpenseFiltersDto,
  UpdateExpenseCategoryDto,
  UpdateExpenseDto,
} from './money.dto';

@Controller('api/money')
export class MoneyController {
  constructor(private readonly moneyService: MoneyService) {}

  @Get('categories')
  getCategories() {
    return this.moneyService.getCategories();
  }

  @Post('categories')
  createCategory(@Body() dto: CreateExpenseCategoryDto) {
    return this.moneyService.createCategory(dto);
  }

  @Patch('categories/:id')
  updateCategory(
    @Param('id') id: string,
    @Body() dto: UpdateExpenseCategoryDto,
  ) {
    return this.moneyService.updateCategory(id, dto);
  }

  @Get('expenses')
  getExpenses(@Query() filters: ExpenseFiltersDto) {
    return this.moneyService.getExpenses(filters);
  }

  @Get('expenses/:id')
  getExpense(@Param('id') id: string) {
    return this.moneyService.getExpense(id);
  }

  @Post('expenses')
  createExpense(@Body() dto: CreateExpenseDto) {
    return this.moneyService.createExpense(dto);
  }

  @Patch('expenses/:id')
  updateExpense(@Param('id') id: string, @Body() dto: UpdateExpenseDto) {
    return this.moneyService.updateExpense(id, dto);
  }

  @Delete('expenses/:id')
  deleteExpense(@Param('id') id: string) {
    return this.moneyService.deleteExpense(id);
  }
}
