import {
  IsArray,
  IsDateString,
  IsEmail,
  IsNotEmpty,
  IsOptional,
  IsString,
} from 'class-validator';

export class CreateCampaignDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsNotEmpty()
  subject: string;

  @IsEmail()
  @IsOptional()
  senderEmail?: string;

  @IsString()
  @IsOptional()
  senderName?: string;

  @IsString()
  @IsNotEmpty()
  templateId: string;

  @IsArray()
  @IsOptional()
  groupIds?: string[];

  @IsArray()
  @IsOptional()
  recipientIds?: string[];

  @IsDateString()
  @IsOptional()
  scheduledAt?: string;
}
