import { Module, OnModuleInit } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from '../../infrastructure/prisma/prisma.module';
import { RedisModule } from '../../infrastructure/redis/redis.module';
import { CampaignModule } from '../campaign/campaign.module';
import { MailModule } from '../mail/mail.module';
import { MailQueueService } from './mail-queue.service';

@Module({
  imports: [
    RedisModule,
    PrismaModule,
    MailModule,
    CampaignModule,
    ConfigModule,
  ],
  providers: [MailQueueService],
  exports: [MailQueueService],
})
export class MailQueueModule implements OnModuleInit {
  constructor(private readonly mailQueueService: MailQueueService) {}

  onModuleInit() {
    // 애플리케이션 시작 시 큐 처리 시작
    this.mailQueueService.startProcessing();
  }
}
