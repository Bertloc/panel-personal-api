import { Type } from 'class-transformer';
import { IsDefined, IsIn, ValidateNested } from 'class-validator';
import { BUDGET_MODES } from '../../common';
import { CreateIncomeSourceDto } from '../income/income.dto';
import { CompleteProfileDto } from '../profiles/profiles.dto';

class CompleteSettingsDto {
  @IsIn(BUDGET_MODES) budgetMode!: string;
}

export class CompleteOnboardingDto {
  @IsDefined()
  @ValidateNested()
  @Type(() => CompleteProfileDto)
  profile!: CompleteProfileDto;

  @IsDefined()
  @ValidateNested()
  @Type(() => CreateIncomeSourceDto)
  income!: CreateIncomeSourceDto;

  @IsDefined()
  @ValidateNested()
  @Type(() => CompleteSettingsDto)
  settings!: CompleteSettingsDto;
}
