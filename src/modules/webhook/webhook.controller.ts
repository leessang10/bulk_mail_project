import { Body, Controller, Headers, Logger, Post } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { MailEventType } from '@prisma/client';
import * as crypto from 'crypto';
import { PrismaService } from '../../infrastructure/prisma/prisma.service';

@Controller('webhooks')
export class WebhookController {
  private readonly logger = new Logger(WebhookController.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
  ) {}

  /**
   * AWS SES 이벤트 웹훅을 처리합니다.
   */
  @Post('ses')
  async handleSesWebhook(
    @Headers('x-amz-sns-message-type') messageType: string,
    @Body() payload: any,
  ) {
    this.logger.log(`SES 웹훅 수신: ${messageType}`);

    // SNS 메시지 타입 확인
    if (messageType === 'SubscriptionConfirmation') {
      // SNS 구독 확인 처리
      return this.handleSubscriptionConfirmation(payload);
    } else if (messageType === 'Notification') {
      // 일반 알림 처리
      return this.processSesEvent(payload);
    }

    return { received: true, type: messageType };
  }

  /**
   * SNS 구독 확인 요청을 처리합니다.
   */
  private async handleSubscriptionConfirmation(payload: any): Promise<any> {
    // 구독 URL 로그
    this.logger.log(`SNS 구독 확인 URL: ${payload.SubscribeURL}`);

    try {
      // 여기서는 구독 URL에 HTTP 요청을 보내서 확인하는 코드가 필요합니다.
      // 이 예제에서는 로깅만 수행합니다.
      return { success: true, message: '구독 확인 URL이 로깅되었습니다.' };
    } catch (error) {
      this.logger.error('SNS 구독 확인 처리 실패', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * SES 이벤트를 처리합니다.
   */
  private async processSesEvent(payload: any): Promise<any> {
    try {
      // SNS 메시지에서 SES 이벤트 추출
      const message = JSON.parse(payload.Message);

      if (!message || !message.eventType) {
        return { success: false, error: '유효하지 않은 SNS 메시지' };
      }

      // SES 이벤트 타입 매핑
      const eventType = this.mapSesEventType(message.eventType);
      const mailHeaders = message.mail?.commonHeaders || {};

      // 메시지 ID 또는 이메일 주소로 캠페인과 수신자 찾기
      let campaignId = null;
      let recipientId = null;

      // 메시지에서 캠페인과 수신자 ID 추출 시도
      const messageId = message.mail?.messageId;
      if (messageId) {
        // 메시지 ID로 발송 이벤트 조회
        const sentEvent = await this.prisma.mailEvent.findFirst({
          where: {
            type: MailEventType.SENT,
            metadata: {
              path: ['messageId'],
              equals: messageId,
            },
          },
        });

        if (sentEvent) {
          campaignId = sentEvent.campaignId;
          recipientId = sentEvent.recipientId;
        }
      }

      // 이메일 주소로 찾기 (메시지 ID로 찾지 못한 경우)
      if (!campaignId && !recipientId && message.mail?.destination?.[0]) {
        const email = message.mail.destination[0];

        // 수신자 찾기
        const recipient = await this.prisma.recipient.findFirst({
          where: { email },
        });

        if (recipient) {
          recipientId = recipient.id;

          // 가장 최근 캠페인 찾기
          const latestEvent = await this.prisma.mailEvent.findFirst({
            where: {
              recipientId: recipient.id,
              type: MailEventType.SENT,
            },
            orderBy: {
              createdAt: 'desc',
            },
          });

          if (latestEvent) {
            campaignId = latestEvent.campaignId;
          }
        }
      }

      // 이벤트 기록
      await this.prisma.mailEvent.create({
        data: {
          type: eventType,
          campaignId,
          recipientId,
          metadata: {
            rawEvent: message,
            subject: mailHeaders.subject,
            timestamp: new Date().toISOString(),
          },
        },
      });

      return { success: true, eventType };
    } catch (error) {
      this.logger.error('SES 이벤트 처리 실패', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * SES 이벤트 타입을 내부 이벤트 타입으로 매핑합니다.
   */
  private mapSesEventType(sesEventType: string): MailEventType {
    const eventMap = {
      Send: MailEventType.SENT,
      Delivery: MailEventType.DELIVERED,
      Open: MailEventType.OPENED,
      Click: MailEventType.CLICKED,
      Bounce: MailEventType.BOUNCED,
      Complaint: MailEventType.COMPLAINED,
      Reject: MailEventType.REJECTED,
    };

    return eventMap[sesEventType] || MailEventType.OTHER;
  }

  /**
   * 이메일 클릭 이벤트를 처리합니다.
   * 트래킹 URL을 통한 클릭 이벤트 처리용입니다.
   */
  @Post('click')
  async handleClickEvent(@Body() payload: any) {
    const { token, url } = payload;

    if (!token || !url) {
      return { success: false, error: '필수 파라미터 누락' };
    }

    try {
      // 토큰 검증
      const tokenSecret = this.configService.get<string>(
        'TRACKING_TOKEN_SECRET',
      );
      const tokenData = this.verifyToken(token, tokenSecret);

      if (!tokenData || !tokenData.campaignId || !tokenData.recipientId) {
        return { success: false, error: '유효하지 않은 토큰' };
      }

      // 클릭 이벤트 기록
      await this.prisma.mailEvent.create({
        data: {
          type: MailEventType.CLICKED,
          campaignId: tokenData.campaignId,
          recipientId: tokenData.recipientId,
          metadata: {
            clickedUrl: url,
            timestamp: new Date().toISOString(),
          },
        },
      });

      // 원래 URL로 리다이렉트
      return { success: true, redirectUrl: url };
    } catch (error) {
      this.logger.error('클릭 이벤트 처리 실패', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * 이벤트 추적 토큰을 검증합니다.
   */
  private verifyToken(token: string, secret: string): any {
    try {
      const parts = token.split('.');
      if (parts.length !== 3) {
        return null;
      }

      const [header, payload, signature] = parts;

      // 서명 검증
      const expectedSignature = crypto
        .createHmac('sha256', secret)
        .update(`${header}.${payload}`)
        .digest('base64url');

      if (signature !== expectedSignature) {
        return null;
      }

      // 페이로드 디코딩
      const decodedPayload = Buffer.from(payload, 'base64url').toString(
        'utf-8',
      );
      return JSON.parse(decodedPayload);
    } catch (error) {
      this.logger.error('토큰 검증 실패', error);
      return null;
    }
  }
}
