import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { UserRole } from '@prisma/client';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { CreateTemplateDto } from './dto/create-template.dto';
import { UpdateTemplateDto } from './dto/update-template.dto';
import { TemplateService } from './template.service';

@ApiTags('템플릿')
@Controller('templates')
@UseGuards(JwtAuthGuard, RolesGuard)
export class TemplateController {
  constructor(private readonly templateService: TemplateService) {}

  @Post()
  @Roles(UserRole.ADMIN, UserRole.USER)
  @ApiOperation({ summary: '새 템플릿 생성' })
  create(
    @Body() createTemplateDto: CreateTemplateDto,
    @CurrentUser('id') userId: string,
  ) {
    return this.templateService.create(createTemplateDto, userId);
  }

  @Get()
  @Roles(UserRole.ADMIN, UserRole.USER)
  @ApiOperation({ summary: '모든 템플릿 조회' })
  findAll(@CurrentUser('id') userId: string) {
    return this.templateService.findAll(userId);
  }

  @Get(':id')
  @Roles(UserRole.ADMIN, UserRole.USER)
  @ApiOperation({ summary: '특정 템플릿 조회' })
  findOne(@Param('id') id: string, @CurrentUser('id') userId: string) {
    return this.templateService.findOne(id, userId);
  }

  @Patch(':id')
  @Roles(UserRole.ADMIN, UserRole.USER)
  @ApiOperation({ summary: '템플릿 업데이트' })
  update(
    @Param('id') id: string,
    @Body() updateTemplateDto: UpdateTemplateDto,
    @CurrentUser('id') userId: string,
  ) {
    return this.templateService.update(id, updateTemplateDto, userId);
  }

  @Delete(':id')
  @Roles(UserRole.ADMIN, UserRole.USER)
  @ApiOperation({ summary: '템플릿 삭제' })
  remove(@Param('id') id: string, @CurrentUser('id') userId: string) {
    return this.templateService.remove(id, userId);
  }

  @Post(':id/preview')
  @Roles(UserRole.ADMIN, UserRole.USER)
  @ApiOperation({ summary: '템플릿 미리보기' })
  preview(
    @Param('id') id: string,
    @CurrentUser('id') userId: string,
    @Body() previewData: Record<string, any>,
  ) {
    return this.templateService.preview(id, userId, previewData);
  }
}
