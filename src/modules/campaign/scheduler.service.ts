import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { CampaignStatus } from '@prisma/client';
import { PrismaService } from '../../infrastructure/prisma/prisma.service';
import { CampaignService } from './campaign.service';

@Injectable()
export class SchedulerService {
  private readonly logger = new Logger(SchedulerService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly campaignService: CampaignService,
  ) {}

  /**
   * 매분마다 예약된 캠페인을 확인하고 실행합니다.
   */
  @Cron('* * * * *')
  async handleScheduledCampaigns() {
    this.logger.debug('예약된 캠페인 확인 중...');

    const now = new Date();
    const scheduledCampaigns = await this.prisma.campaign.findMany({
      where: {
        status: CampaignStatus.SCHEDULED,
        scheduledAt: {
          lte: now,
        },
      },
    });

    for (const campaign of scheduledCampaigns) {
      try {
        this.logger.log(`캠페인 ${campaign.id} 실행 시작`);

        // 캠페인 상태를 SENDING으로 변경하고 발송 시작
        await this.campaignService.updateCampaignStatus(campaign.id, {
          status: CampaignStatus.SENDING,
        });

        this.logger.log(`캠페인 ${campaign.id} 실행 완료`);
      } catch (error) {
        this.logger.error(
          `캠페인 ${campaign.id} 실행 중 오류 발생: ${error.message}`,
          error.stack,
        );
      }
    }
  }

  /**
   * 매일 자정에 오래된 예약 캠페인을 정리합니다.
   */
  @Cron('0 0 * * *')
  async cleanupOldScheduledCampaigns() {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const oldCampaigns = await this.prisma.campaign.findMany({
      where: {
        status: CampaignStatus.SCHEDULED,
        scheduledAt: {
          lt: thirtyDaysAgo,
        },
      },
    });

    for (const campaign of oldCampaigns) {
      try {
        await this.campaignService.updateCampaignStatus(campaign.id, {
          status: CampaignStatus.CANCELLED,
        });

        this.logger.log(`오래된 예약 캠페인 ${campaign.id} 취소됨`);
      } catch (error) {
        this.logger.error(
          `캠페인 ${campaign.id} 취소 중 오류 발생: ${error.message}`,
          error.stack,
        );
      }
    }
  }
}
