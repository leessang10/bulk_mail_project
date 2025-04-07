import { ApiProperty } from '@nestjs/swagger';
import {
  IsEmail,
  IsNotEmpty,
  IsObject,
  IsOptional,
  IsString,
} from 'class-validator';

export class CreateRecipientDto {
  @ApiProperty({
    example: 'user@example.com',
    description: '수신자 이메일 주소',
  })
  @IsEmail()
  @IsNotEmpty()
  email: string;

  @ApiProperty({
    example: '홍길동',
    description: '수신자 이름',
    required: false,
  })
  @IsString()
  @IsOptional()
  name?: string;

  @ApiProperty({
    example: { company: '회사명', department: '부서명' },
    description: '추가 필드',
    required: false,
    additionalProperties: {
      type: 'string',
    },
  })
  @IsObject()
  @IsOptional()
  customFields?: Record<string, any>;
}
