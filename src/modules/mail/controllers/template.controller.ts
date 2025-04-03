import {
  Body,
  Controller,
  DefaultValuePipe,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { CreateTemplateDto } from '../dto/create-template.dto';
import { TemplateService } from '../services/template.service';

@Controller('api/v1/templates')
export class TemplateController {
  constructor(private readonly templateService: TemplateService) {}

  /**
   * 새 템플릿을 생성합니다.
   */
  @Post()
  async create(@Body() createTemplateDto: CreateTemplateDto) {
    return this.templateService.createTemplate(createTemplateDto);
  }

  /**
   * 모든 템플릿을 조회합니다.
   */
  @Get()
  async findAll(
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(20), ParseIntPipe) limit: number,
  ) {
    return this.templateService.findAllTemplates(page, limit);
  }

  /**
   * ID로 템플릿을 조회합니다.
   */
  @Get(':id')
  async findOne(@Param('id') id: string) {
    return this.templateService.findTemplateById(id);
  }

  /**
   * 템플릿 미리보기 HTML을 생성합니다.
   */
  @Get(':id/preview')
  async preview(
    @Param('id') id: string,
    @Query() previewData: Record<string, string>,
  ) {
    const html = await this.templateService.previewTemplate(id, previewData);
    return { html };
  }

  /**
   * 템플릿을 업데이트합니다.
   */
  @Patch(':id')
  async update(
    @Param('id') id: string,
    @Body() updateTemplateDto: Partial<CreateTemplateDto>,
  ) {
    return this.templateService.updateTemplate(id, updateTemplateDto);
  }

  /**
   * 템플릿을 삭제합니다.
   */
  @Delete(':id')
  async remove(@Param('id') id: string) {
    return this.templateService.deleteTemplate(id);
  }
}
