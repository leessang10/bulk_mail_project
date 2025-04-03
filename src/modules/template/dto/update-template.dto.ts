import { IsOptional, IsString } from 'class-validator';

export class UpdateTemplateDto {
  @IsString()
  @IsOptional()
  name?: string;

  @IsString()
  @IsOptional()
  mjmlContent?: string;

  @IsString()
  @IsOptional()
  description?: string;
}
