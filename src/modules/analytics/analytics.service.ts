import { Injectable, Logger } from '@nestjs/common';
import { MailEventType } from '@prisma/client';
import { REDIS_KEYS } from '../../common/constants/redis.constant';
import { PrismaService } from '../../infrastructure/prisma/prisma.service';
import { RedisService } from '../../infrastructure/redis/redis.service';

@Injectable()
export class AnalyticsService {
  private readonly logger = new Logger(AnalyticsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
  ) {}

  /**
   * 캠페인의 전체 성과 지표를 조회합니다.
   */
  async getCampaignPerformance(campaignId: string) {
    // 캐시된 데이터 확인
    const cacheKey = REDIS_KEYS.MAIL_ANALYTICS.replace(
      '{campaignId}',
      campaignId,
    );
    const cachedData = await this.redis.get(cacheKey);
    if (cachedData) {
      return JSON.parse(cachedData);
    }

    // 캠페인 정보 조회
    const campaign = await this.prisma.campaign.findUnique({
      where: { id: campaignId },
      include: {
        recipients: true,
        mailEvents: true,
      },
    });

    if (!campaign) {
      return null;
    }

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

    const totalRecipients = campaign.recipients.length;
    const result = {
      campaignId,
      campaignName: campaign.name,
      totalRecipients,
      metrics: {
        sent: eventCountMap[MailEventType.SENT] || 0,
        delivered: eventCountMap[MailEventType.DELIVERED] || 0,
        opened: eventCountMap[MailEventType.OPENED] || 0,
        clicked: eventCountMap[MailEventType.CLICKED] || 0,
        bounced: eventCountMap[MailEventType.BOUNCED] || 0,
        complained: eventCountMap[MailEventType.COMPLAINED] || 0,
      },
      rates: {
        deliveryRate: this.calculateRate(
          eventCountMap[MailEventType.DELIVERED],
          totalRecipients,
        ),
        openRate: this.calculateRate(
          eventCountMap[MailEventType.OPENED],
          totalRecipients,
        ),
        clickRate: this.calculateRate(
          eventCountMap[MailEventType.CLICKED],
          totalRecipients,
        ),
        bounceRate: this.calculateRate(
          eventCountMap[MailEventType.BOUNCED],
          totalRecipients,
        ),
        complaintRate: this.calculateRate(
          eventCountMap[MailEventType.COMPLAINED],
          totalRecipients,
        ),
      },
      updatedAt: new Date(),
    };

    // 결과 캐싱 (5분)
    await this.redis.set(cacheKey, JSON.stringify(result), 300);

    return result;
  }

  /**
   * 시간대별 이메일 성과를 분석합니다.
   */
  async getHourlyPerformance(campaignId: string) {
    const events = await this.prisma.mailEvent.findMany({
      where: { campaignId },
      select: {
        type: true,
        createdAt: true,
      },
      orderBy: {
        createdAt: 'asc',
      },
    });

    // 시간대별 이벤트 집계
    const hourlyStats = events.reduce((acc, event) => {
      const hour = event.createdAt.getHours();
      if (!acc[hour]) {
        acc[hour] = {
          hour,
          sent: 0,
          delivered: 0,
          opened: 0,
          clicked: 0,
        };
      }

      switch (event.type) {
        case MailEventType.SENT:
          acc[hour].sent++;
          break;
        case MailEventType.DELIVERED:
          acc[hour].delivered++;
          break;
        case MailEventType.OPENED:
          acc[hour].opened++;
          break;
        case MailEventType.CLICKED:
          acc[hour].clicked++;
          break;
      }

      return acc;
    }, {});

    return Object.values(hourlyStats);
  }

  /**
   * 수신자 그룹별 성과를 분석합니다.
   */
  async getGroupPerformance(campaignId: string) {
    const campaign = await this.prisma.campaign.findUnique({
      where: { id: campaignId },
      include: {
        groups: {
          include: {
            recipients: {
              include: {
                recipient: {
                  include: {
                    mailEvents: {
                      where: { campaignId },
                    },
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!campaign) {
      return null;
    }

    return campaign.groups.map((group) => {
      const recipients = group.recipients.map((gr) => gr.recipient);
      const totalRecipients = recipients.length;

      // 그룹별 이벤트 집계
      const eventCounts = recipients.reduce((acc, recipient) => {
        recipient.mailEvents.forEach((event) => {
          if (!acc[event.type]) {
            acc[event.type] = 0;
          }
          acc[event.type]++;
        });
        return acc;
      }, {});

      return {
        groupId: group.id,
        groupName: group.name,
        totalRecipients,
        metrics: {
          sent: eventCounts[MailEventType.SENT] || 0,
          delivered: eventCounts[MailEventType.DELIVERED] || 0,
          opened: eventCounts[MailEventType.OPENED] || 0,
          clicked: eventCounts[MailEventType.CLICKED] || 0,
        },
        rates: {
          deliveryRate: this.calculateRate(
            eventCounts[MailEventType.DELIVERED],
            totalRecipients,
          ),
          openRate: this.calculateRate(
            eventCounts[MailEventType.OPENED],
            totalRecipients,
          ),
          clickRate: this.calculateRate(
            eventCounts[MailEventType.CLICKED],
            totalRecipients,
          ),
        },
      };
    });
  }

  /**
   * 비율을 계산합니다.
   */
  private calculateRate(count: number, total: number): number {
    if (!total) return 0;
    return Number((((count || 0) / total) * 100).toFixed(2));
  }
}
