import { Module } from '@nestjs/common';
import { KafkaModule } from '../../infrastructure/kafka/kafka.module';
import { PrismaModule } from '../../infrastructure/prisma/prisma.module';
import { RedisModule } from '../../infrastructure/redis/redis.module';
import { MailModule } from '../mail/mail.module';
import { MailQueueController } from './mail-queue.controller';
import { MailQueueService } from './mail-queue.service';

@Module({
  imports: [PrismaModule, RedisModule, KafkaModule, MailModule],
  controllers: [MailQueueController],
  providers: [MailQueueService],
  exports: [MailQueueService],
})
export class MailQueueModule {}
