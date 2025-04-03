import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import * as Handlebars from 'handlebars';
import * as mjml2html from 'mjml';
import { PrismaService } from '../../infrastructure/prisma/prisma.service';
import { CreateTemplateDto } from './dto/create-template.dto';
import { UpdateTemplateDto } from './dto/update-template.dto';

@Injectable()
export class TemplateService {
  private readonly logger = new Logger(TemplateService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * 새 템플릿을 생성합니다.
   */
  async create(createTemplateDto: CreateTemplateDto, userId: string) {
    // MJML 유효성 검사
    try {
      this.validateMjml(createTemplateDto.mjmlContent);
    } catch (error) {
      throw new BadRequestException(
        `MJML 템플릿이 유효하지 않습니다: ${error.message}`,
      );
    }

    return this.prisma.mailTemplate.create({
      data: {
        name: createTemplateDto.name,
        description: createTemplateDto.description,
        mjmlContent: createTemplateDto.mjmlContent,
        category: createTemplateDto.category,
        mergeTags: createTemplateDto.mergeTags || {},
        userId,
      },
    });
  }

  /**
   * 모든 템플릿을 조회합니다.
   */
  async findAll(userId: string) {
    return this.prisma.mailTemplate.findMany({
      where: {
        userId,
      },
      orderBy: { updatedAt: 'desc' },
    });
  }

  /**
   * 특정 템플릿을 조회합니다.
   */
  async findOne(id: string, userId: string) {
    const template = await this.prisma.mailTemplate.findFirst({
      where: {
        id,
        userId,
      },
    });

    if (!template) {
      throw new NotFoundException('템플릿을 찾을 수 없습니다.');
    }

    return template;
  }

  /**
   * 템플릿을 업데이트합니다.
   */
  async update(
    id: string,
    updateTemplateDto: UpdateTemplateDto,
    userId: string,
  ) {
    await this.findOne(id, userId);

    if (updateTemplateDto.mjmlContent) {
      try {
        this.validateMjml(updateTemplateDto.mjmlContent);
      } catch (error) {
        throw new BadRequestException(
          `MJML 템플릿이 유효하지 않습니다: ${error.message}`,
        );
      }
    }

    return this.prisma.mailTemplate.update({
      where: { id },
      data: {
        name: updateTemplateDto.name,
        description: updateTemplateDto.description,
        mjmlContent: updateTemplateDto.mjmlContent,
        category: updateTemplateDto.category,
        mergeTags: updateTemplateDto.mergeTags,
      },
    });
  }

  /**
   * 템플릿을 삭제합니다.
   */
  async remove(id: string, userId: string) {
    await this.findOne(id, userId);

    await this.prisma.mailTemplate.delete({
      where: { id },
    });

    return { id };
  }

  /**
   * 템플릿을 미리보기합니다.
   */
  async preview(
    id: string,
    userId: string,
    previewData: Record<string, any> = {},
  ) {
    const template = await this.findOne(id, userId);

    try {
      // MJML을 HTML로 변환
      const { html } = mjml2html(template.mjmlContent);

      // Handlebars 템플릿 컴파일
      const compiledTemplate = Handlebars.compile(html);

      // 미리보기 데이터로 템플릿 렌더링
      const renderedHtml = compiledTemplate({
        ...this.getDefaultPreviewData(),
        ...previewData,
      });

      return {
        html: renderedHtml,
      };
    } catch (error) {
      throw new BadRequestException(
        `템플릿 렌더링 중 오류 발생: ${error.message}`,
      );
    }
  }

  /**
   * 템플릿을 HTML로 변환합니다.
   */
  async renderTemplate(templateId: string, mergeFields: Record<string, any>) {
    const template = await this.prisma.mailTemplate.findFirst({
      where: {
        id: templateId,
      },
    });

    if (!template) {
      throw new NotFoundException('템플릿을 찾을 수 없습니다.');
    }

    try {
      // MJML을 HTML로 변환
      const { html } = mjml2html(template.mjmlContent);

      // Handlebars 템플릿 컴파일
      const compiledTemplate = Handlebars.compile(html);

      // 머지 필드로 템플릿 렌더링
      return compiledTemplate(mergeFields);
    } catch (error) {
      throw new BadRequestException(
        `템플릿 렌더링 중 오류 발생: ${error.message}`,
      );
    }
  }

  /**
   * MJML 템플릿의 유효성을 검사합니다.
   */
  private validateMjml(mjmlContent: string) {
    const { errors } = mjml2html(mjmlContent);
    if (errors && errors.length > 0) {
      throw new Error(errors.map((e) => e.message).join(', '));
    }
  }

  /**
   * 기본 미리보기 데이터를 반환합니다.
   */
  private getDefaultPreviewData() {
    return {
      name: '홍길동',
      email: 'test@example.com',
      unsubscribeUrl: 'http://example.com/unsubscribe',
      currentYear: new Date().getFullYear(),
      companyName: '테스트 회사',
      companyAddress: '서울시 강남구',
    };
  }
}
