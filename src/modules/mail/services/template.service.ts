import { Injectable, NotFoundException } from '@nestjs/common';
import { MailTemplate } from '@prisma/client';
import { MergeFields } from '../../../common/interfaces/mail.interface';
import {
  convertMjmlToHtml,
  processMergeFields,
} from '../../../common/utils/mail.util';
import { PrismaService } from '../../../infrastructure/prisma/prisma.service';
import { CreateTemplateDto } from '../dto/create-template.dto';

@Injectable()
export class TemplateService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * 새 메일 템플릿을 생성합니다.
   */
  async createTemplate(
    createTemplateDto: CreateTemplateDto,
  ): Promise<MailTemplate> {
    return this.prisma.mailTemplate.create({
      data: createTemplateDto,
    });
  }

  /**
   * 모든 메일 템플릿을 조회합니다.
   */
  async findAllTemplates(
    page = 1,
    limit = 20,
  ): Promise<{ templates: MailTemplate[]; total: number }> {
    const skip = (page - 1) * limit;

    const [templates, total] = await Promise.all([
      this.prisma.mailTemplate.findMany({
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.mailTemplate.count(),
    ]);

    return { templates, total };
  }

  /**
   * ID로 템플릿을 조회합니다.
   */
  async findTemplateById(id: string): Promise<MailTemplate> {
    const template = await this.prisma.mailTemplate.findUnique({
      where: { id },
    });

    if (!template) {
      throw new NotFoundException(`ID ${id}의 템플릿을 찾을 수 없습니다.`);
    }

    return template;
  }

  /**
   * MJML을 HTML로 변환합니다.
   */
  convertMjmlToHtml(mjmlContent: string): string {
    return convertMjmlToHtml(mjmlContent);
  }

  /**
   * 템플릿에 머지 필드를 적용합니다.
   */
  processMergeFields(template: string, mergeFields: MergeFields): string {
    return processMergeFields(template, mergeFields);
  }

  /**
   * 머지 필드를 적용하고 HTML로 변환합니다.
   */
  async processTemplate(
    templateId: string,
    mergeFields: MergeFields,
  ): Promise<string> {
    // MJML 템플릿 가져오기
    const template = await this.findTemplateById(templateId);

    // 머지 필드 처리
    const processedMjml = this.processMergeFields(
      template.mjmlContent,
      mergeFields,
    );

    // HTML로 변환
    return this.convertMjmlToHtml(processedMjml);
  }

  /**
   * 템플릿 미리보기를 위한 HTML을 생성합니다.
   */
  async previewTemplate(
    id: string,
    previewData: Record<string, string>,
  ): Promise<string> {
    const template = await this.findTemplateById(id);

    // 머지 필드 적용
    const processedMjml = this.processMergeFields(
      template.mjmlContent,
      previewData,
    );

    // HTML로 변환
    return this.convertMjmlToHtml(processedMjml);
  }

  /**
   * 템플릿을 업데이트합니다.
   */
  async updateTemplate(
    id: string,
    updateData: Partial<CreateTemplateDto>,
  ): Promise<MailTemplate> {
    await this.findTemplateById(id); // 템플릿 존재 확인

    return this.prisma.mailTemplate.update({
      where: { id },
      data: {
        ...updateData,
        version: { increment: 1 }, // 버전 증가
      },
    });
  }

  /**
   * 템플릿을 삭제합니다.
   */
  async deleteTemplate(id: string): Promise<MailTemplate> {
    await this.findTemplateById(id); // 템플릿 존재 확인

    return this.prisma.mailTemplate.delete({
      where: { id },
    });
  }
}
