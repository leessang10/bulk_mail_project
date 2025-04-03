import { Module } from '@nestjs/common';
import { KafkaModule } from '../../infrastructure/kafka/kafka.module';
import { PrismaModule } from '../../infrastructure/prisma/prisma.module';
import { WebhookController } from './webhook.controller';
import { WebhookService } from './webhook.service';

@Module({
  imports: [PrismaModule, KafkaModule],
  controllers: [WebhookController],
  providers: [WebhookService],
})
export class WebhookModule {}
