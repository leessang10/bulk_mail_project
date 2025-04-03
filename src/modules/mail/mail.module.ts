import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { RecipientModule } from '../recipient/recipient.module';
import { MailController } from './controllers/mail.controller';
import { TemplateController } from './controllers/template.controller';
import { MailService } from './services/mail.service';
import { TemplateService } from './services/template.service';

@Module({
  imports: [
    RecipientModule,
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        secret: configService.get<string>('JWT_SECRET'),
        signOptions: { expiresIn: '30d' },
      }),
    }),
  ],
  controllers: [MailController, TemplateController],
  providers: [MailService, TemplateService],
  exports: [MailService, TemplateService],
})
export class MailModule {}
