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
    comment?: string,
  ) {
    const template = await this.findOne(id, userId);

    if (updateTemplateDto.mjmlContent) {
      try {
        this.validateMjml(updateTemplateDto.mjmlContent);
      } catch (error) {
        throw new BadRequestException(
          `MJML 템플릿이 유효하지 않습니다: ${error.message}`,
        );
      }
    }

    // 현재 버전을 히스토리에 저장
    await this.prisma.mailTemplateVersion.create({
      data: {
        templateId: id,
        version: template.version,
        mjmlContent: template.mjmlContent,
        description: template.description,
        mergeTags: template.mergeTags,
        comment,
        createdBy: userId,
      },
    });

    // 템플릿 업데이트
    return this.prisma.mailTemplate.update({
      where: { id },
      data: {
        name: updateTemplateDto.name,
        description: updateTemplateDto.description,
        mjmlContent: updateTemplateDto.mjmlContent,
        category: updateTemplateDto.category,
        mergeTags: updateTemplateDto.mergeTags,
        version: template.version + 1,
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

  /**
   * 템플릿을 복제합니다.
   */
  async clone(id: string, userId: string, newName?: string) {
    const template = await this.findOne(id, userId);

    const clonedTemplate = await this.prisma.mailTemplate.create({
      data: {
        name: newName || `${template.name} (복사본)`,
        description: template.description,
        mjmlContent: template.mjmlContent,
        category: template.category,
        mergeTags: template.mergeTags,
        userId,
      },
    });

    this.logger.log(`Template ${id} cloned to ${clonedTemplate.id}`);
    return clonedTemplate;
  }

  /**
   * 템플릿의 버전 기록을 조회합니다.
   */
  async getVersionHistory(id: string, userId: string) {
    await this.findOne(id, userId);

    return this.prisma.mailTemplateVersion.findMany({
      where: {
        templateId: id,
      },
      orderBy: {
        version: 'desc',
      },
    });
  }

  /**
   * 특정 버전의 템플릿을 조회합니다.
   */
  async getVersion(id: string, version: number, userId: string) {
    await this.findOne(id, userId);

    const templateVersion = await this.prisma.mailTemplateVersion.findUnique({
      where: {
        templateId_version: {
          templateId: id,
          version,
        },
      },
    });

    if (!templateVersion) {
      throw new NotFoundException('해당 버전을 찾을 수 없습니다.');
    }

    return templateVersion;
  }

  /**
   * 특정 버전으로 템플릿을 복원합니다.
   */
  async restoreVersion(id: string, version: number, userId: string) {
    const templateVersion = await this.getVersion(id, version, userId);

    // 현재 버전을 히스토리에 저장
    const currentTemplate = await this.findOne(id, userId);
    await this.prisma.mailTemplateVersion.create({
      data: {
        templateId: id,
        version: currentTemplate.version + 1,
        mjmlContent: currentTemplate.mjmlContent,
        description: currentTemplate.description,
        mergeTags: currentTemplate.mergeTags,
        comment: `버전 ${version}에서 복원`,
        createdBy: userId,
      },
    });

    // 선택한 버전으로 복원
    return this.prisma.mailTemplate.update({
      where: { id },
      data: {
        mjmlContent: templateVersion.mjmlContent,
        description: templateVersion.description,
        mergeTags: templateVersion.mergeTags,
        version: currentTemplate.version + 1,
      },
    });
  }

  /**
   * 두 버전의 템플릿을 비교합니다.
   */
  async compareVersions(
    id: string,
    version1: number,
    version2: number,
    userId: string,
  ) {
    const [v1, v2] = await Promise.all([
      this.getVersion(id, version1, userId),
      this.getVersion(id, version2, userId),
    ]);

    return {
      mjmlContentDiff: {
        version1: v1.mjmlContent,
        version2: v2.mjmlContent,
      },
      mergeTagsDiff: {
        version1: v1.mergeTags,
        version2: v2.mergeTags,
      },
      descriptionDiff: {
        version1: v1.description,
        version2: v2.description,
      },
      metadata: {
        version1: {
          createdAt: v1.createdAt,
          createdBy: v1.createdBy,
          comment: v1.comment,
        },
        version2: {
          createdAt: v2.createdAt,
          createdBy: v2.createdBy,
          comment: v2.comment,
        },
      },
    };
  }
}
