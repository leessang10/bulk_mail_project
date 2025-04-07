import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
  Redirect,
} from '@nestjs/common';
import {
  ApiBody,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { RecipientService } from '../../recipient/recipient.service';
import { MailService } from '../services/mail.service';
import { TemplateService } from '../services/template.service';

@ApiTags('mail')
@Controller('mail')
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
  @ApiOperation({ summary: '테스트 이메일 발송' })
  @ApiResponse({ status: 200, description: '테스트 메일 발송 성공' })
  @ApiResponse({ status: 400, description: '잘못된 요청' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        to: { type: 'string', example: 'test@example.com' },
        subject: { type: 'string', example: '테스트 메일입니다' },
        templateId: { type: 'string' },
        mergeFields: { type: 'object' },
        from: { type: 'string' },
        fromName: { type: 'string' },
      },
      required: ['to', 'subject', 'templateId', 'mergeFields'],
    },
  })
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
  @ApiOperation({ summary: '수신 거부 처리' })
  @ApiResponse({ status: 302, description: '수신 거부 처리 후 리다이렉션' })
  @ApiQuery({ name: 'token', description: '수신 거부 토큰' })
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
  @ApiOperation({ summary: '메일 템플릿 미리보기' })
  @ApiResponse({ status: 200, description: '템플릿 미리보기 HTML 생성 성공' })
  @ApiParam({ name: 'templateId', description: '템플릿 ID' })
  @ApiQuery({
    name: 'previewData',
    description: '미리보기용 데이터',
    required: false,
    type: 'object',
  })
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
