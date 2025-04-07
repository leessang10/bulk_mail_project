import { ApiProperty } from '@nestjs/swagger';
import {
  IsArray,
  IsDateString,
  IsEmail,
  IsNotEmpty,
  IsOptional,
  IsString,
} from 'class-validator';

export class CreateCampaignDto {
  @ApiProperty({
    example: '2024년 3월 뉴스레터',
    description: '캠페인 이름',
  })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({
    example: '[뉴스레터] 3월의 소식을 전해드립니다',
    description: '이메일 제목',
  })
  @IsString()
  @IsNotEmpty()
  subject: string;

  @ApiProperty({
    example: 'newsletter@company.com',
    description: '발신자 이메일',
  })
  @IsEmail()
  @IsOptional()
  senderEmail?: string;

  @ApiProperty({
    example: '회사 뉴스레터',
    description: '발신자 이름',
  })
  @IsString()
  @IsNotEmpty()
  senderName?: string;

  @ApiProperty({
    example: '2024-03-20T09:00:00Z',
    description: '발송 예약 시간 (선택)',
    required: false,
  })
  @IsDateString()
  @IsOptional()
  scheduledAt?: string;

  @ApiProperty({
    example: ['group-id-1', 'group-id-2'],
    description: '수신자 그룹 ID 목록',
  })
  @IsArray()
  @IsOptional()
  groupIds?: string[];

  @ApiProperty({
    example: 'template-id-1',
    description: '메일 템플릿 ID',
  })
  @IsString()
  @IsNotEmpty()
  templateId: string;

  @ApiProperty({
    example: ['recipient-id-1', 'recipient-id-2'],
    description: '개별 수신자 ID 목록',
    required: false,
    type: [String],
  })
  @IsArray()
  @IsOptional()
  recipientIds?: string[];
}
