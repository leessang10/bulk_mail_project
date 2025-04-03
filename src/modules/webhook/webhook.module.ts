import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from '../../infrastructure/prisma/prisma.module';
import { WebhookController } from './webhook.controller';

@Module({
  imports: [PrismaModule, ConfigModule],
  controllers: [WebhookController],
})
export class WebhookModule {}
