import {
  SESClient,
  SendEmailCommand,
  SendEmailCommandInput,
} from '@aws-sdk/client-ses';
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import {
  MailSendResult,
  MergeFields,
} from '../../../common/interfaces/mail.interface';
import { generateUnsubscribeUrl } from '../../../common/utils/mail.util';
import { PrismaService } from '../../../infrastructure/prisma/prisma.service';
import { TemplateService } from './template.service';

@Injectable()
export class MailService {
  private readonly sesClient: SESClient;
  private readonly logger = new Logger(MailService.name);

  constructor(
    private readonly configService: ConfigService,
    private readonly prisma: PrismaService,
    private readonly templateService: TemplateService,
    private readonly jwtService: JwtService,
  ) {
    this.sesClient = new SESClient({
      region: this.configService.get<string>('AWS_REGION', 'us-east-1'),
      credentials: {
        accessKeyId: this.configService.get<string>('AWS_ACCESS_KEY_ID', ''),
        secretAccessKey: this.configService.get<string>(
          'AWS_SECRET_ACCESS_KEY',
          '',
        ),
      },
    });
  }

  /**
   * 단일 이메일을 발송합니다.
   */
  async sendEmail(params: {
    to: string | string[];
    subject: string;
    html: string;
    from?: string;
    fromName?: string;
    replyTo?: string;
    campaignId?: string;
    recipientId?: string;
  }): Promise<MailSendResult> {
    try {
      const {
        to,
        subject,
        html,
        from,
        fromName,
        replyTo,
        campaignId,
        recipientId,
      } = params;

      const fromEmail =
        from || this.configService.get<string>('DEFAULT_SENDER_EMAIL');
      const fromNameStr =
        fromName || this.configService.get<string>('DEFAULT_SENDER_NAME');

      const toAddresses = Array.isArray(to) ? to : [to];

      const input: SendEmailCommandInput = {
        Source: fromNameStr ? `${fromNameStr} <${fromEmail}>` : fromEmail,
        Destination: {
          ToAddresses: toAddresses,
        },
        Message: {
          Subject: {
            Charset: 'UTF-8',
            Data: subject,
          },
          Body: {
            Html: {
              Charset: 'UTF-8',
              Data: html,
            },
          },
        },
        ConfigurationSetName: 'BulkMailTracking', // AWS SES Configuration Set 이름
      };

      if (replyTo) {
        input.ReplyToAddresses = [replyTo];
      }

      // 메일 전송
      const command = new SendEmailCommand(input);
      const response = await this.sesClient.send(command);

      // 이벤트 로깅 (캠페인 및 수신자 정보가 있는 경우)
      if (campaignId && recipientId) {
        await this.prisma.mailEvent.create({
          data: {
            type: 'SENT',
            messageId: response.MessageId,
            campaignId,
            recipientId,
            metadata: {
              timestamp: new Date().toISOString(),
            },
          },
        });
      }

      return {
        messageId: response.MessageId,
        success: true,
      };
    } catch (error) {
      this.logger.error(`Failed to send email: ${error.message}`, error.stack);

      return {
        success: false,
        error,
      };
    }
  }

  /**
   * 템플릿 기반으로 이메일을 발송합니다.
   */
  async sendTemplateEmail(params: {
    to: string | string[];
    subject: string;
    templateId: string;
    mergeFields: MergeFields;
    from?: string;
    fromName?: string;
    replyTo?: string;
    campaignId?: string;
    recipientId?: string;
  }): Promise<MailSendResult> {
    try {
      const {
        to,
        subject,
        templateId,
        mergeFields,
        from,
        fromName,
        replyTo,
        campaignId,
        recipientId,
      } = params;

      // 수신거부 토큰 생성 (캠페인 및 수신자 정보가 있는 경우)
      if (campaignId && recipientId) {
        const unsubscribeToken = this.generateUnsubscribeToken(
          recipientId,
          campaignId,
        );
        const baseUrl = this.configService.get<string>('UNSUBSCRIBE_BASE_URL');
        const unsubscribeUrl = generateUnsubscribeUrl(
          baseUrl,
          unsubscribeToken,
        );

        // 머지 필드에 수신거부 URL 추가
        mergeFields.unsubscribeUrl = unsubscribeUrl;

        // 토큰 저장
        await this.prisma.unsubscribeToken.create({
          data: {
            token: unsubscribeToken,
            recipientId,
            campaignId,
            expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30일 후 만료
          },
        });
      }

      // 템플릿 처리 및 HTML 변환
      const htmlContent = await this.templateService.processTemplate(
        templateId,
        mergeFields,
      );

      // 이메일 발송
      return this.sendEmail({
        to,
        subject,
        html: htmlContent,
        from,
        fromName,
        replyTo,
        campaignId,
        recipientId,
      });
    } catch (error) {
      this.logger.error(
        `Failed to send template email: ${error.message}`,
        error.stack,
      );

      return {
        success: false,
        error,
      };
    }
  }

  /**
   * 수신거부 토큰을 생성합니다.
   */
  generateUnsubscribeToken(recipientId: string, campaignId: string): string {
    const payload = {
      sub: recipientId,
      campaignId,
      type: 'unsubscribe',
    };

    return this.jwtService.sign(payload, {
      expiresIn: '30d',
      secret: this.configService.get<string>('JWT_SECRET'),
    });
  }

  /**
   * 수신거부 토큰을 검증합니다.
   */
  verifyUnsubscribeToken(token: string): {
    recipientId: string;
    campaignId: string;
  } {
    try {
      const payload = this.jwtService.verify(token, {
        secret: this.configService.get<string>('JWT_SECRET'),
      });

      return {
        recipientId: payload.sub,
        campaignId: payload.campaignId,
      };
    } catch (error) {
      this.logger.error(`Invalid unsubscribe token: ${error.message}`);
      throw error;
    }
  }
}
