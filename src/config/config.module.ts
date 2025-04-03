import { Module } from '@nestjs/common';
import { ConfigModule as NestConfigModule } from '@nestjs/config';
import { join } from 'path';

@Module({
  imports: [
    NestConfigModule.forRoot({
      isGlobal: true, // 전역 모듈로 설정
      envFilePath: [
        join(process.cwd(), `.env.${process.env.NODE_ENV || 'development'}`),
        join(process.cwd(), '.env'),
      ],
      // 환경변수 유효성 검사 (필요시 추가)
      // validationSchema: Joi.object({...}),
    }),
  ],
  exports: [NestConfigModule],
})
export class ConfigModule {}
