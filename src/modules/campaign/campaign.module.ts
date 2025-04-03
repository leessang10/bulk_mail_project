import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { KafkaModule } from '../../infrastructure/kafka/kafka.module';
import { PrismaModule } from '../../infrastructure/prisma/prisma.module';
import { MailModule } from '../mail/mail.module';
import { CampaignController } from './campaign.controller';
import { CampaignService } from './campaign.service';
import { SchedulerService } from './scheduler.service';

@Module({
  imports: [PrismaModule, KafkaModule, MailModule, ScheduleModule.forRoot()],
  controllers: [CampaignController],
  providers: [CampaignService, SchedulerService],
  exports: [CampaignService],
})
export class CampaignModule {}
