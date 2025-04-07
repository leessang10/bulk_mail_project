import { ApiProperty } from '@nestjs/swagger';
import { IsArray, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class CreateGroupDto {
  @ApiProperty({
    example: '뉴스레터 구독자',
    description: '수신자 그룹 이름',
  })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({
    example: '월간 뉴스레터를 구독하는 사용자 그룹',
    description: '수신자 그룹 설명',
    required: false,
  })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiProperty({
    example: ['recipient-id-1', 'recipient-id-2'],
    description: '그룹에 추가할 수신자 ID 목록',
    required: false,
    type: [String],
  })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  recipientIds?: string[];
}
