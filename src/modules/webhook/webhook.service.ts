import { Injectable, Logger } from '@nestjs/common';
import { MailEventType } from '@prisma/client';
import { KAFKA_TOPICS } from '../../common/constants/kafka.constant';
import { KafkaService } from '../../infrastructure/kafka/kafka.service';
import { PrismaService } from '../../infrastructure/prisma/prisma.service';

@Injectable()
export class WebhookService {
  private readonly logger = new Logger(WebhookService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly kafka: KafkaService,
  ) {}

  async handleSESEvent(event: any) {
    const { eventType, mail } = event;
    const messageId = mail.messageId;

    // 메일 이벤트 조회
    const mailEvent = await this.prisma.mailEvent.findFirst({
      where: { messageId },
      include: { campaign: true },
    });

    if (!mailEvent) {
      this.logger.warn(
        `메시지 ID에 해당하는 이벤트를 찾을 수 없습니다: ${messageId}`,
      );
      return;
    }

    // 이벤트 타입 매핑
    let eventTypeEnum: MailEventType;
    switch (eventType) {
      case 'Delivery':
        eventTypeEnum = MailEventType.DELIVERED;
        break;
      case 'Bounce':
        eventTypeEnum = MailEventType.BOUNCED;
        break;
      case 'Complaint':
        eventTypeEnum = MailEventType.COMPLAINED;
        break;
      case 'Open':
        eventTypeEnum = MailEventType.OPENED;
        break;
      case 'Click':
        eventTypeEnum = MailEventType.CLICKED;
        break;
      default:
        this.logger.warn(`알 수 없는 이벤트 타입: ${eventType}`);
        return;
    }

    // 이벤트 저장
    await this.prisma.mailEvent.create({
      data: {
        type: eventTypeEnum,
        messageId,
        campaignId: mailEvent.campaignId,
        recipientId: mailEvent.recipientId,
        metadata: event,
      },
    });

    // Kafka 이벤트 발행
    await this.kafka.emit(KAFKA_TOPICS.MAIL_EVENT, {
      type: eventTypeEnum,
      messageId,
      campaignId: mailEvent.campaignId,
      recipientId: mailEvent.recipientId,
      metadata: event,
    });

    return { success: true };
  }
}
