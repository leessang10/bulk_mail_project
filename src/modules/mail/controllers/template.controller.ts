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
import {
  ApiBody,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { CreateTemplateDto } from '../dto/create-template.dto';
import { TemplateService } from '../services/template.service';

@ApiTags('templates')
@Controller('templates')
export class TemplateController {
  constructor(private readonly templateService: TemplateService) {}

  /**
   * 새 템플릿을 생성합니다.
   */
  @Post()
  @ApiOperation({ summary: '새 메일 템플릿 생성' })
  @ApiResponse({ status: 201, description: '템플릿이 성공적으로 생성됨' })
  @ApiBody({ type: CreateTemplateDto })
  async create(@Body() createTemplateDto: CreateTemplateDto) {
    return this.templateService.createTemplate(createTemplateDto);
  }

  /**
   * 모든 템플릿을 조회합니다.
   */
  @Get()
  @ApiOperation({ summary: '모든 메일 템플릿 조회' })
  @ApiResponse({ status: 200, description: '템플릿 목록 조회 성공' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
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
  @ApiOperation({ summary: '특정 메일 템플릿 조회' })
  @ApiResponse({ status: 200, description: '템플릿 조회 성공' })
  @ApiResponse({ status: 404, description: '템플릿을 찾을 수 없음' })
  @ApiParam({ name: 'id', description: '템플릿 ID' })
  async findOne(@Param('id') id: string) {
    return this.templateService.findTemplateById(id);
  }

  /**
   * 템플릿 미리보기 HTML을 생성합니다.
   */
  @Get(':id/preview')
  @ApiOperation({ summary: '메일 템플릿 미리보기' })
  @ApiResponse({ status: 200, description: '템플릿 미리보기 HTML 생성 성공' })
  @ApiParam({ name: 'id', description: '템플릿 ID' })
  @ApiQuery({
    name: 'previewData',
    description: '미리보기용 데이터',
    required: false,
    type: 'object',
  })
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
  @ApiOperation({ summary: '메일 템플릿 수정' })
  @ApiResponse({ status: 200, description: '템플릿이 성공적으로 수정됨' })
  @ApiResponse({ status: 404, description: '템플릿을 찾을 수 없음' })
  @ApiParam({ name: 'id', description: '템플릿 ID' })
  @ApiBody({ type: CreateTemplateDto })
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
  @ApiOperation({ summary: '메일 템플릿 삭제' })
  @ApiResponse({ status: 200, description: '템플릿이 성공적으로 삭제됨' })
  @ApiResponse({ status: 404, description: '템플릿을 찾을 수 없음' })
  @ApiParam({ name: 'id', description: '템플릿 ID' })
  async remove(@Param('id') id: string) {
    return this.templateService.deleteTemplate(id);
  }
}
