import { Module } from '@nestjs/common';
import { KafkaModule } from '../../infrastructure/kafka/kafka.module';
import { PrismaModule } from '../../infrastructure/prisma/prisma.module';
import { MailModule } from '../mail/mail.module';
import { CampaignController } from './campaign.controller';
import { CampaignService } from './campaign.service';
@Module({
  imports: [PrismaModule, KafkaModule, MailModule],
  controllers: [CampaignController],
  providers: [CampaignService],
  exports: [CampaignService],
})
export class CampaignModule {}
