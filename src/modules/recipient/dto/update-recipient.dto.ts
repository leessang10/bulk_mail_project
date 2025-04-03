import { IsEmail, IsObject, IsOptional, IsString } from 'class-validator';

export class UpdateRecipientDto {
  @IsEmail()
  @IsOptional()
  email?: string;

  @IsString()
  @IsOptional()
  name?: string;

  @IsObject()
  @IsOptional()
  customFields?: Record<string, any>;
}
