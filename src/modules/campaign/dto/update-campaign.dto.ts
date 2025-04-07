import { PartialType } from '@nestjs/mapped-types';
import { ApiProperty } from '@nestjs/swagger';
import { IsDateString, IsOptional, IsString } from 'class-validator';
import { CreateCampaignDto } from './create-campaign.dto';

export class UpdateCampaignDto extends PartialType(CreateCampaignDto) {
  @ApiProperty({
    example: '2024년 3월 뉴스레터 (수정)',
    description: '캠페인 이름',
    required: false,
  })
  @IsString()
  @IsOptional()
  name?: string;

  @ApiProperty({
    example: '[수정] 3월의 소식을 전해드립니다',
    description: '이메일 제목',
    required: false,
  })
  @IsString()
  @IsOptional()
  subject?: string;

  @ApiProperty({
    example: 'new-newsletter@company.com',
    description: '발신자 이메일',
    required: false,
  })
  @IsString()
  @IsOptional()
  senderEmail?: string;

  @ApiProperty({
    example: '새로운 뉴스레터',
    description: '발신자 이름',
    required: false,
  })
  @IsString()
  @IsOptional()
  senderName?: string;

  @ApiProperty({
    example: '2024-03-21T09:00:00Z',
    description: '발송 예약 시간',
    required: false,
  })
  @IsDateString()
  @IsOptional()
  scheduledAt?: string;
}
