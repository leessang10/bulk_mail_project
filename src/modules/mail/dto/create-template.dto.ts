import { ApiProperty } from '@nestjs/swagger';
import {
  IsBoolean,
  IsNotEmpty,
  IsObject,
  IsOptional,
  IsString,
} from 'class-validator';

export class CreateTemplateDto {
  @ApiProperty({
    example: '월간 뉴스레터 템플릿',
    description: '템플릿 이름',
  })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({
    example:
      '<mjml><mj-body><mj-section><mj-column><mj-text>Hello {{name}}</mj-text></mj-column></mj-section></mj-body></mjml>',
    description: 'MJML 형식의 템플릿 내용',
  })
  @IsString()
  @IsNotEmpty()
  mjmlContent: string;

  @ApiProperty({
    example: '월간 뉴스레터에 사용되는 기본 템플릿입니다.',
    description: '템플릿 설명',
    required: false,
  })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiProperty({
    example: {
      name: { type: 'string', description: '수신자 이름' },
      company: { type: 'string', description: '회사명' },
    },
    description: '템플릿에서 사용되는 머지 태그 정의',
    required: false,
    additionalProperties: {
      type: 'object',
      properties: {
        type: { type: 'string' },
        description: { type: 'string' },
      },
    },
  })
  @IsObject()
  @IsOptional()
  mergeTags?: Record<string, { type: string; description: string }>;

  @IsBoolean()
  @IsOptional()
  isActive?: boolean;

  @IsString()
  userId: string;
}
