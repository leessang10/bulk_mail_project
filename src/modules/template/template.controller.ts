import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { UserRole } from '@prisma/client';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { CreateTemplateDto } from './dto/create-template.dto';
import { UpdateTemplateDto } from './dto/update-template.dto';
import { TemplateService } from './template.service';

@ApiTags('템플릿')
@ApiBearerAuth('JWT')
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
    @Query('comment') comment?: string,
  ) {
    return this.templateService.update(id, updateTemplateDto, userId, comment);
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

  @Post(':id/clone')
  @Roles(UserRole.ADMIN, UserRole.USER)
  @ApiOperation({ summary: '템플릿 복제' })
  clone(
    @Param('id') id: string,
    @CurrentUser('id') userId: string,
    @Query('newName') newName?: string,
  ) {
    return this.templateService.clone(id, userId, newName);
  }

  @Get(':id/versions')
  @Roles(UserRole.ADMIN, UserRole.USER)
  @ApiOperation({ summary: '템플릿 버전 기록 조회' })
  getVersionHistory(
    @Param('id') id: string,
    @CurrentUser('id') userId: string,
  ) {
    return this.templateService.getVersionHistory(id, userId);
  }

  @Get(':id/versions/:version')
  @Roles(UserRole.ADMIN, UserRole.USER)
  @ApiOperation({ summary: '특정 버전의 템플릿 조회' })
  getVersion(
    @Param('id') id: string,
    @Param('version') version: number,
    @CurrentUser('id') userId: string,
  ) {
    return this.templateService.getVersion(id, version, userId);
  }

  @Post(':id/versions/:version/restore')
  @Roles(UserRole.ADMIN, UserRole.USER)
  @ApiOperation({ summary: '특정 버전으로 템플릿 복원' })
  restoreVersion(
    @Param('id') id: string,
    @Param('version') version: number,
    @CurrentUser('id') userId: string,
  ) {
    return this.templateService.restoreVersion(id, version, userId);
  }

  @Get(':id/versions/compare')
  @Roles(UserRole.ADMIN, UserRole.USER)
  @ApiOperation({ summary: '두 버전의 템플릿 비교' })
  compareVersions(
    @Param('id') id: string,
    @Query('version1') version1: number,
    @Query('version2') version2: number,
    @CurrentUser('id') userId: string,
  ) {
    return this.templateService.compareVersions(id, version1, version2, userId);
  }
}
