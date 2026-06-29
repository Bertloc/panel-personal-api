import { Type } from 'class-transformer';
import {
  IsDateString,
  IsIn,
  IsInt,
  IsOptional,
  Max,
  Min,
} from 'class-validator';
export class HeatmapQueryDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(2000)
  @Max(2100)
  year?: number;

  @IsOptional()
  @IsIn(['general', 'habits', 'money', 'saving', 'debt'])
  filter?: string;

  @IsOptional()
  @IsIn(['general', 'habits', 'money', 'saving', 'debt'])
  filterType?: string;
}
export class RecalculateProgressDto {
  @IsOptional() @IsDateString() date?: string;
  @IsOptional() @IsDateString() startDate?: string;
  @IsOptional() @IsDateString() endDate?: string;
}
