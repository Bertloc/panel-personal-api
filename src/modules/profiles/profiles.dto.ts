import { IsOptional, IsString, Length, Matches } from 'class-validator';

export class UpdateProfileDto {
  @IsOptional() @IsString() @Matches(/\S/) displayName?: string;
  @IsOptional() @IsString() @Length(3, 3) currency?: string;
  @IsOptional() @IsString() @Matches(/\S/) timezone?: string;
}

export class CompleteProfileDto {
  @IsString() @Matches(/\S/) displayName!: string;
  @IsString() @Length(3, 3) currency!: string;
  @IsOptional() @IsString() @Matches(/\S/) timezone?: string;
}
