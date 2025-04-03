import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
  Redirect,
} from '@nestjs/common';
import { RecipientService } from '../../recipient/recipient.service';
import { MailService } from '../services/mail.service';
import { TemplateService } from '../services/template.service';

@Controller('api/v1/mail')
export class MailController {
  constructor(
    private readonly mailService: MailService,
    private readonly templateService: TemplateService,
    private readonly recipientService: RecipientService,
  ) {}

  /**
   * 템플릿 기반으로 테스트 이메일을 발송합니다.
   */
  @Post('test')
  async sendTestEmail(
    @Body()
    body: {
      to: string;
      subject: string;
      templateId: string;
      mergeFields: Record<string, any>;
      from?: string;
      fromName?: string;
    },
  ) {
    return this.mailService.sendTemplateEmail({
      to: body.to,
      subject: body.subject,
      templateId: body.templateId,
      mergeFields: body.mergeFields,
      from: body.from,
      fromName: body.fromName,
    });
  }

  /**
   * 수신거부 처리를 합니다.
   */
  @Get('unsubscribe')
  @Redirect() // 리디렉션 응답을 반환합니다.
  async unsubscribe(@Query('token') token: string) {
    try {
      // 토큰 검증
      const { recipientId } = this.mailService.verifyUnsubscribeToken(token);

      // 수신거부 처리
      await this.recipientService.unsubscribe(recipientId);

      // 성공 페이지로 리디렉션
      return { url: '/unsubscribe-success' };
    } catch (error) {
      // 에러 로깅
      console.error('Unsubscribe error:', error.message);

      // 오류 페이지로 리디렉션
      return { url: '/unsubscribe-error' };
    }
  }

  /**
   * 메일 미리보기 기능을 제공합니다.
   */
  @Get('preview/:templateId')
  async previewTemplate(
    @Param('templateId') templateId: string,
    @Query() previewData: Record<string, string>,
  ) {
    // 템플릿 HTML 생성
    const html = await this.templateService.previewTemplate(
      templateId,
      previewData,
    );

    // HTML 응답
    return { html };
  }
}
