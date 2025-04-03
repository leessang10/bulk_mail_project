import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { CampaignStatus, MailEventType } from '@prisma/client';
import { REDIS_KEYS, REDIS_QUEUE } from '../../common/constants/redis.constant';
import { MergeFields } from '../../common/types/mail.type';
import { PrismaService } from '../../infrastructure/prisma/prisma.service';
import { RedisService } from '../../infrastructure/redis/redis.service';
import { CampaignService } from '../campaign/campaign.service';
import { MailService } from '../mail/services/mail.service';

@Injectable()
export class MailQueueService {
  private readonly logger = new Logger(MailQueueService.name);
  private interval: NodeJS.Timeout;
  private isProcessing = false;
  private readonly BATCH_SIZE = 50; // 한 번에 처리할 이메일 수
  private readonly MAX_RETRIES = 3; // 최대 재시도 횟수
  private readonly lockDuration = 60 * 30; // Redis 락 유지 시간 (30분)

  constructor(
    private readonly redis: RedisService,
    private readonly prisma: PrismaService,
    private readonly mailService: MailService,
    private readonly campaignService: CampaignService,
    private readonly configService: ConfigService,
  ) {}

  /**
   * 메일 큐 처리 시작
   */
  startProcessing(): void {
    if (this.interval) {
      return;
    }

    const intervalMs =
      this.configService.get<number>('MAIL_QUEUE_INTERVAL') || 10000;
    this.logger.log(`메일 큐 처리 시작 (간격: ${intervalMs}ms)`);

    this.interval = setInterval(() => {
      this.processQueue().catch((err) => {
        this.logger.error('메일 큐 처리 중 오류 발생', err);
      });
    }, intervalMs);
  }

  /**
   * 메일 큐 처리 중단
   */
  stopProcessing(): void {
    if (this.interval) {
      clearInterval(this.interval);
      this.interval = null;
      this.logger.log('메일 큐 처리 중단');
    }
  }

  /**
   * 메일 큐 처리 메인 로직
   */
  private async processQueue(): Promise<void> {
    if (this.isProcessing) {
      return;
    }

    this.isProcessing = true;
    const lockKey = REDIS_KEYS.QUEUE_LOCK;

    try {
      // 락 획득 시도
      const lockAcquired = await this.redis.setIfNotExists(
        lockKey,
        'true',
        this.lockDuration,
      );

      if (!lockAcquired) {
        this.logger.log('다른 인스턴스가 큐를 처리 중입니다.');
        this.isProcessing = false;
        return;
      }

      // 처리 대기 중인 캠페인 조회
      const pendingCampaigns = await this.prisma.campaign.findMany({
        where: {
          status: CampaignStatus.SENDING,
        },
        orderBy: {
          updatedAt: 'asc',
        },
        take: 5, // 한 번에 최대 5개 캠페인 처리
      });

      if (pendingCampaigns.length === 0) {
        this.isProcessing = false;
        await this.redis.delete(lockKey);
        return;
      }

      // 각 캠페인별 처리
      for (const campaign of pendingCampaigns) {
        await this.processCampaign(campaign.id);
      }
    } catch (error) {
      this.logger.error('큐 처리 중 오류 발생', error);
    } finally {
      this.isProcessing = false;
      await this.redis.delete(lockKey);
    }
  }

  /**
   * 단일 캠페인 처리
   */
  private async processCampaign(campaignId: string): Promise<void> {
    // 캠페인 정보 조회
    const campaign = await this.prisma.campaign.findUnique({
      where: { id: campaignId },
      include: {
        template: true,
      },
    });

    if (!campaign || campaign.status !== CampaignStatus.SENDING) {
      return;
    }

    // 처리 진행 상황 확인 (레디스에서 대기 중인 작업 배치 조회)
    const pattern = `${REDIS_QUEUE.MAIL_SEND}:${campaignId}:batch:*`;
    const pendingBatchKeys = await this.redis.keys(pattern);

    if (pendingBatchKeys.length === 0) {
      // 모든 배치가 처리됨 - 캠페인 완료 처리
      await this.prisma.campaign.update({
        where: { id: campaignId },
        data: {
          status: CampaignStatus.COMPLETED,
          completedAt: new Date(),
        },
      });

      this.logger.log(`캠페인 ${campaignId} 완료됨`);
      return;
    }

    // 배치 처리 (한 번에 하나의 배치만 처리)
    const batchKey = pendingBatchKeys[0];
    const batchDataString = await this.redis.get(batchKey);

    if (!batchDataString) {
      await this.redis.delete(batchKey);
      return;
    }

    try {
      const batchData = JSON.parse(batchDataString);
      const { recipientIds } = batchData;

      this.logger.log(
        `캠페인 ${campaignId} 배치 처리 시작: ${recipientIds.length}명`,
      );

      // 배치 내 수신자를 BATCH_SIZE 단위로 처리
      for (let i = 0; i < recipientIds.length; i += this.BATCH_SIZE) {
        const chunk = recipientIds.slice(i, i + this.BATCH_SIZE);
        await this.processBatchChunk(campaign, chunk);
      }

      // 배치 처리 완료 후 키 삭제
      await this.redis.delete(batchKey);
    } catch (error) {
      this.logger.error(`배치 처리 중 오류 발생 (${batchKey})`, error);

      // 배치 처리 실패 카운트 증가
      const retryKey = `${batchKey}:retries`;
      const retries = parseInt((await this.redis.get(retryKey)) || '0', 10);

      if (retries >= this.MAX_RETRIES) {
        this.logger.error(`최대 재시도 횟수 초과 (${batchKey}), 배치 건너뜀`);
        await this.redis.delete(batchKey);
        await this.redis.delete(retryKey);
      } else {
        await this.redis.set(retryKey, (retries + 1).toString());
      }
    }
  }

  /**
   * 배치 청크 처리 (작은 그룹의 수신자에 대한 이메일 발송)
   */
  private async processBatchChunk(
    campaign: any,
    recipientIds: string[],
  ): Promise<void> {
    // 수신자 정보 조회
    const recipients = await this.prisma.recipient.findMany({
      where: {
        id: { in: recipientIds },
        status: 'ACTIVE', // 활성 상태인 수신자만
      },
    });

    // 각 수신자별 메일 발송
    const promises = recipients.map(async (recipient) => {
      try {
        // 구독 취소 토큰 생성
        const mergeFields: MergeFields = {
          name: recipient.name || '',
          email: recipient.email,
          unsubscribeUrl: await this.mailService.generateUnsubscribeToken(
            campaign.id,
            recipient.id,
          ),
        };

        // 템플릿 기반 이메일 발송
        const result = await this.mailService.sendTemplateEmail({
          to: recipient.email,
          subject: campaign.subject,
          templateId: campaign.templateId,
          mergeFields,
          campaignId: campaign.id,
          recipientId: recipient.id,
          from: campaign.senderEmail,
          fromName: campaign.senderName,
        });

        // 발송 이벤트 로그
        await this.prisma.mailEvent.create({
          data: {
            campaignId: campaign.id,
            recipientId: recipient.id,
            type: MailEventType.SENT,
            metadata: {
              messageId: result.messageId,
            },
          },
        });

        return { success: true, recipientId: recipient.id };
      } catch (error) {
        this.logger.error(`메일 발송 실패 (${recipient.email})`, error);

        // 실패 이벤트 로그
        await this.prisma.mailEvent.create({
          data: {
            campaignId: campaign.id,
            recipientId: recipient.id,
            type: MailEventType.FAILED,
            metadata: {
              error: error.message,
            },
          },
        });

        return {
          success: false,
          recipientId: recipient.id,
          error: error.message,
        };
      }
    });

    await Promise.all(promises);
  }

  /**
   * 캠페인의 메일 큐에 수신자 추가
   */
  async addToCampaignQueue(
    campaignId: string,
    recipientIds: string[],
  ): Promise<void> {
    const campaign = await this.prisma.campaign.findUnique({
      where: { id: campaignId },
    });

    if (!campaign) {
      throw new Error(`캠페인을 찾을 수 없습니다: ${campaignId}`);
    }

    // 배치 처리 (1,000명씩)
    const batchSize = 1000;
    for (let i = 0; i < recipientIds.length; i += batchSize) {
      const batch = recipientIds.slice(i, i + batchSize);

      // Redis에 큐 항목 추가
      const queueKey = `${REDIS_QUEUE.MAIL_SEND}:${campaignId}:batch:${i}`;
      await this.redis.set(
        queueKey,
        JSON.stringify({
          campaignId,
          batchIndex: i,
          recipientIds: batch,
          templateId: campaign.templateId,
          subject: campaign.subject,
          senderEmail: campaign.senderEmail,
          senderName: campaign.senderName,
        }),
      );
    }

    this.logger.log(
      `캠페인 ${campaignId}에 ${recipientIds.length}명의 수신자 추가됨`,
    );
  }
}
