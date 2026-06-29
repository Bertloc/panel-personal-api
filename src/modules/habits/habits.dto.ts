import {
  IsBoolean,
  IsDateString,
  IsIn,
  IsOptional,
  IsString,
  MinLength,
} from 'class-validator';
export class CreateHabitDto {
  @IsString() @MinLength(1) name!: string;
  @IsOptional() @IsString() description?: string;
  @IsIn(['morning', 'afternoon', 'night', 'anytime']) moment!: string;
  @IsOptional() @IsBoolean() isFinancial?: boolean;
  @IsOptional() @IsBoolean() isKeyHabit?: boolean;
  @IsOptional() @IsBoolean() isActive?: boolean;
}
export class UpdateHabitDto {
  @IsOptional() @IsString() @MinLength(1) name?: string;
  @IsOptional() @IsString() description?: string;
  @IsOptional()
  @IsIn(['morning', 'afternoon', 'night', 'anytime'])
  moment?: string;
  @IsOptional() @IsBoolean() isFinancial?: boolean;
  @IsOptional() @IsBoolean() isKeyHabit?: boolean;
  @IsOptional() @IsBoolean() isActive?: boolean;
}
export class LogHabitDto {
  @IsDateString() logDate!: string;
  @IsIn(['completed', 'skipped', 'missed']) status!: string;
  @IsOptional() @IsString() note?: string;
}
export class UpdateHabitLogDto {
  @IsOptional() @IsDateString() logDate?: string;
  @IsOptional() @IsIn(['completed', 'skipped', 'missed']) status?: string;
  @IsOptional() @IsString() note?: string;
}
