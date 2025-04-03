import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsObject, IsOptional, IsString } from 'class-validator';

export class CreateTemplateDto {
  @ApiProperty({
    description: '템플릿 이름',
    example: '환영 이메일 템플릿',
  })
  @IsNotEmpty()
  @IsString()
  name: string;

  @ApiProperty({
    description: '템플릿 설명',
    example: '신규 사용자를 위한 환영 이메일 템플릿입니다.',
    required: false,
  })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({
    description: 'MJML 템플릿 내용',
    example:
      '<mjml><mj-body><mj-section><mj-column><mj-text>Hello {{name}}!</mj-text></mj-column></mj-section></mj-body></mjml>',
  })
  @IsNotEmpty()
  @IsString()
  mjmlContent: string;

  @ApiProperty({
    description: '템플릿 카테고리',
    example: '마케팅',
    required: false,
  })
  @IsOptional()
  @IsString()
  category?: string;

  @ApiProperty({
    description: '머지 태그 정의',
    example: {
      name: {
        type: 'string',
        description: '수신자 이름',
        defaultValue: '고객',
      },
      email: {
        type: 'string',
        description: '수신자 이메일',
      },
    },
    required: false,
  })
  @IsObject()
  @IsOptional()
  mergeTags?: Record<
    string,
    {
      type: string;
      description: string;
      defaultValue?: string;
    }
  >;
}
