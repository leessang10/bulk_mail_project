import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Campaign, CampaignStatus, Recipient } from '@prisma/client';
import { KAFKA_TOPICS } from '../../common/constants/kafka.constant';
import { REDIS_KEYS } from '../../common/constants/redis.constant';
import { PrismaService } from '../../infrastructure/prisma/prisma.service';
import { RedisService } from '../../infrastructure/redis/redis.service';
import { MailService } from '../mail/services/mail.service';
import { CreateCampaignDto } from './dto/create-campaign.dto';
import { UpdateCampaignStatusDto } from './dto/update-campaign-status.dto';

@Injectable()
export class CampaignService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
    private readonly mailService: MailService,
  ) {}

  /**
   * 새 캠페인을 생성합니다.
   */
  async createCampaign(
    createCampaignDto: CreateCampaignDto,
  ): Promise<Campaign> {
    const { groupIds, recipientIds, senderEmail, senderName, ...campaignData } =
      createCampaignDto;

    // 환경변수에서 기본 발신자 정보 가져오기
    const defaultSenderEmail = process.env.DEFAULT_SENDER_EMAIL;
    const defaultSenderName = process.env.DEFAULT_SENDER_NAME;

    return this.prisma.$transaction(async (tx) => {
      // 1. 캠페인 생성
      const campaign = await tx.campaign.create({
        data: {
          ...campaignData,
          senderEmail: senderEmail || defaultSenderEmail,
          senderName: senderName || defaultSenderName,
          status: CampaignStatus.DRAFT,
        },
      });

      // 2. 그룹 연결 (있는 경우)
      if (groupIds && groupIds.length > 0) {
        await tx.campaign.update({
          where: { id: campaign.id },
          data: {
            groups: {
              connect: groupIds.map((id) => ({ id })),
            },
          },
        });
      }

      // 3. 개별 수신자 연결 (있는 경우)
      if (recipientIds && recipientIds.length > 0) {
        await tx.campaignRecipient.createMany({
          data: recipientIds.map((recipientId) => ({
            campaignId: campaign.id,
            recipientId,
          })),
          skipDuplicates: true,
        });
      }

      // 4. 캠페인 상태 Redis에 저장
      const redisKey = REDIS_KEYS.CAMPAIGN_STATUS.replace('{id}', campaign.id);
      await this.redis.set(redisKey, CampaignStatus.DRAFT);

      return campaign;
    });
  }

  /**
   * 캠페인 정보를 조회합니다.
   */
  async findCampaign(id: string): Promise<Campaign> {
    const campaign = await this.prisma.campaign.findUnique({
      where: { id },
      include: {
        template: true,
        groups: true,
      },
    });

    if (!campaign) {
      throw new NotFoundException(`ID ${id}의 캠페인을 찾을 수 없습니다.`);
    }

    return campaign;
  }

  /**
   * 모든 캠페인을 조회합니다.
   */
  async findAllCampaigns(
    page = 1,
    limit = 20,
    status?: CampaignStatus,
  ): Promise<{ campaigns: Campaign[]; total: number }> {
    const skip = (page - 1) * limit;

    const where = status ? { status } : {};

    const [campaigns, total] = await Promise.all([
      this.prisma.campaign.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          template: {
            select: {
              id: true,
              name: true,
            },
          },
          _count: {
            select: {
              recipients: true,
              groups: true,
            },
          },
        },
      }),
      this.prisma.campaign.count({ where }),
    ]);

    return { campaigns, total };
  }

  /**
   * 캠페인 상태를 업데이트합니다.
   */
  async updateCampaignStatus(
    id: string,
    updateStatusDto: UpdateCampaignStatusDto,
  ): Promise<Campaign> {
    const campaign = await this.findCampaign(id);

    // 상태 변경 검증
    this.validateStatusChange(campaign.status, updateStatusDto.status);

    const updatedCampaign = await this.prisma.campaign.update({
      where: { id },
      data: {
        status: updateStatusDto.status,
        scheduledAt: updateStatusDto.scheduledAt
          ? new Date(updateStatusDto.scheduledAt)
          : campaign.scheduledAt,
      },
    });

    // Redis에 상태 업데이트
    const redisKey = REDIS_KEYS.CAMPAIGN_STATUS.replace('{id}', id);
    await this.redis.set(redisKey, updateStatusDto.status);

    // 상태가 SENDING으로 변경된 경우 메일 발송 시작
    if (updateStatusDto.status === CampaignStatus.SENDING) {
      await this.startSendingCampaign(id);
    }

    return updatedCampaign;
  }

  /**
   * 상태 변경이 유효한지 검증합니다.
   */
  private validateStatusChange(
    currentStatus: CampaignStatus,
    newStatus: CampaignStatus,
  ): void {
    // 캠페인 상태 변경 규칙
    const validStatusTransitions = {
      [CampaignStatus.DRAFT]: [
        CampaignStatus.SCHEDULED,
        CampaignStatus.SENDING,
        CampaignStatus.CANCELLED,
      ],
      [CampaignStatus.SCHEDULED]: [
        CampaignStatus.SENDING,
        CampaignStatus.CANCELLED,
      ],
      [CampaignStatus.SENDING]: [
        CampaignStatus.COMPLETED,
        CampaignStatus.FAILED,
      ],
      [CampaignStatus.COMPLETED]: [],
      [CampaignStatus.CANCELLED]: [CampaignStatus.DRAFT],
      [CampaignStatus.FAILED]: [CampaignStatus.DRAFT],
    };

    if (!validStatusTransitions[currentStatus].includes(newStatus)) {
      throw new BadRequestException(
        `현재 상태 ${currentStatus}에서 ${newStatus}로 변경할 수 없습니다.`,
      );
    }
  }

  /**
   * 캠페인 메일 발송을 시작합니다.
   */
  private async startSendingCampaign(campaignId: string): Promise<void> {
    // 캠페인 정보 조회
    const campaign = await this.prisma.campaign.findUnique({
      where: { id: campaignId },
      include: {
        template: true,
      },
    });

    // 수신자 가져오기
    const recipients = await this.getCampaignRecipients(campaignId);

    // 수신자가 없는 경우
    if (recipients.length === 0) {
      await this.prisma.campaign.update({
        where: { id: campaignId },
        data: {
          status: CampaignStatus.COMPLETED,
          sentAt: new Date(),
        },
      });
      return;
    }

    // 배치 처리 (1,000명씩)
    const batchSize = 1000;
    for (let i = 0; i < recipients.length; i += batchSize) {
      const batch = recipients.slice(i, i + batchSize);

      // Kafka 메시지로 발송 요청
      await this.redis.set(
        `${KAFKA_TOPICS.MAIL_SEND}:${campaignId}:batch:${i}`,
        JSON.stringify({
          campaignId,
          batchIndex: i,
          recipientIds: batch.map((r) => r.id),
          templateId: campaign.templateId,
          subject: campaign.subject,
          senderEmail: campaign.senderEmail,
          senderName: campaign.senderName,
        }),
      );
    }

    // 발송 시작 시간 기록
    await this.prisma.campaign.update({
      where: { id: campaignId },
      data: {
        sentAt: new Date(),
      },
    });
  }

  /**
   * 캠페인의 모든 수신자를 가져옵니다.
   */
  async getCampaignRecipients(campaignId: string): Promise<Recipient[]> {
    // 캠페인에 직접 연결된 수신자
    const directRecipients = await this.prisma.recipient.findMany({
      where: {
        campaigns: {
          some: {
            campaignId,
          },
        },
        status: 'ACTIVE', // 활성 상태인 수신자만
      },
    });

    // 캠페인에 연결된 그룹의 수신자
    const groupRecipients = await this.prisma.recipient.findMany({
      where: {
        groups: {
          some: {
            group: {
              campaigns: {
                some: {
                  id: campaignId,
                },
              },
            },
          },
        },
        status: 'ACTIVE', // 활성 상태인 수신자만
      },
    });

    // 중복 제거
    const uniqueRecipients = new Map<string, Recipient>();

    [...directRecipients, ...groupRecipients].forEach((recipient) => {
      if (!uniqueRecipients.has(recipient.id)) {
        uniqueRecipients.set(recipient.id, recipient);
      }
    });

    return Array.from(uniqueRecipients.values());
  }

  /**
   * 테스트 이메일을 발송합니다.
   */
  async sendTestEmail(campaignId: string, testEmails: string[]): Promise<any> {
    // 캠페인 정보 조회
    const campaign = await this.findCampaign(campaignId);

    // 테스트 이메일 발송
    const results = await Promise.all(
      testEmails.map((email) => {
        // 머지 필드 (테스트용)
        const mergeFields = {
          name: 'Test User',
          email: email,
          unsubscribeUrl: `${process.env.UNSUBSCRIBE_BASE_URL}/unsubscribe?token=test`,
        };

        // 템플릿 기반 이메일 발송
        return this.mailService.sendTemplateEmail({
          to: email,
          subject: `[TEST] ${campaign.subject}`,
          templateId: campaign.templateId,
          mergeFields,
          from: campaign.senderEmail,
          fromName: campaign.senderName,
        });
      }),
    );

    return {
      success: results.every((r) => r.success),
      results,
    };
  }

  /**
   * 캠페인 분석 정보를 조회합니다.
   */
  async getCampaignAnalytics(campaignId: string): Promise<any> {
    // 수신자 수 계산
    const recipientCount = await this.prisma.campaignRecipient.count({
      where: { campaignId },
    });

    // 이벤트별 집계
    const eventCounts = await this.prisma.mailEvent.groupBy({
      by: ['type'],
      where: { campaignId },
      _count: true,
    });

    // 이벤트 타입별 집계 결과 변환
    const eventCountMap = eventCounts.reduce((acc, curr) => {
      acc[curr.type] = curr._count;
      return acc;
    }, {});

    // 결과 구성
    return {
      recipientCount,
      sentCount: eventCountMap['SENT'] || 0,
      deliveredCount: eventCountMap['DELIVERED'] || 0,
      openedCount: eventCountMap['OPENED'] || 0,
      clickedCount: eventCountMap['CLICKED'] || 0,
      bouncedCount: eventCountMap['BOUNCED'] || 0,
      complainedCount: eventCountMap['COMPLAINED'] || 0,
      // 비율 계산
      openRate:
        recipientCount > 0
          ? (eventCountMap['OPENED'] || 0) / recipientCount
          : 0,
      clickRate:
        recipientCount > 0
          ? (eventCountMap['CLICKED'] || 0) / recipientCount
          : 0,
      bounceRate:
        recipientCount > 0
          ? (eventCountMap['BOUNCED'] || 0) / recipientCount
          : 0,
    };
  }
}
