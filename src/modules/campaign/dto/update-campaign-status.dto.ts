import { CampaignStatus } from '@prisma/client';
import { IsDateString, IsEnum, IsOptional } from 'class-validator';

export class UpdateCampaignStatusDto {
  @IsEnum(CampaignStatus)
  status: CampaignStatus;

  @IsDateString()
  @IsOptional()
  scheduledAt?: string;
}
