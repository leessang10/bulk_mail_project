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
import {
  ApiBody,
  ApiOperation,
  ApiParam,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { UserRole } from '@prisma/client';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { CampaignService } from './campaign.service';
import { CreateCampaignDto } from './dto/create-campaign.dto';
import { UpdateCampaignDto } from './dto/update-campaign.dto';

@ApiTags('campaigns')
@Controller('campaigns')
@UseGuards(JwtAuthGuard, RolesGuard)
export class CampaignController {
  constructor(private readonly campaignService: CampaignService) {}

  /**
   * 새 캠페인을 생성합니다.
   */
  @Post()
  @Roles(UserRole.ADMIN, UserRole.USER)
  @ApiOperation({ summary: '새 캠페인 생성' })
  @ApiResponse({ status: 201, description: '캠페인이 성공적으로 생성됨' })
  @ApiBody({ type: CreateCampaignDto })
  create(
    @Body() createCampaignDto: CreateCampaignDto,
    @CurrentUser() userId: string,
  ) {
    return this.campaignService.createCampaign(createCampaignDto, userId);
  }

  /**
   * 모든 캠페인을 조회합니다.
   */
  @Get()
  @Roles(UserRole.ADMIN, UserRole.USER)
  @ApiOperation({ summary: '모든 캠페인 조회' })
  @ApiResponse({ status: 200, description: '캠페인 목록 조회 성공' })
  findAll(@CurrentUser() userId: string) {
    return this.campaignService.findAll(userId);
  }

  /**
   * 특정 캠페인을 조회합니다.
   */
  @Get(':id')
  @Roles(UserRole.ADMIN, UserRole.USER)
  @ApiOperation({ summary: '특정 캠페인 조회' })
  @ApiResponse({ status: 200, description: '캠페인 조회 성공' })
  @ApiResponse({ status: 404, description: '캠페인을 찾을 수 없음' })
  @ApiParam({ name: 'id', description: '캠페인 ID' })
  findOne(@Param('id') id: string, @CurrentUser() userId: string) {
    return this.campaignService.findOne(id, userId);
  }

  /**
   * 캠페인 상태를 업데이트합니다.
   */
  @Patch(':id')
  @Roles(UserRole.ADMIN, UserRole.USER)
  @ApiOperation({ summary: '캠페인 정보 수정' })
  @ApiResponse({ status: 200, description: '캠페인이 성공적으로 수정됨' })
  @ApiResponse({ status: 404, description: '캠페인을 찾을 수 없음' })
  @ApiParam({ name: 'id', description: '캠페인 ID' })
  @ApiBody({ type: UpdateCampaignDto })
  update(
    @Param('id') id: string,
    @Body() updateCampaignDto: UpdateCampaignDto,
    @CurrentUser() userId: string,
  ) {
    return this.campaignService.update(id, updateCampaignDto, userId);
  }

  /**
   * 캠페인을 삭제합니다.
   */
  @Delete(':id')
  @Roles(UserRole.ADMIN, UserRole.USER)
  @ApiOperation({ summary: '캠페인 삭제' })
  @ApiResponse({ status: 200, description: '캠페인이 성공적으로 삭제됨' })
  @ApiResponse({ status: 404, description: '캠페인을 찾을 수 없음' })
  @ApiParam({ name: 'id', description: '캠페인 ID' })
  remove(@Param('id') id: string, @CurrentUser() userId: string) {
    return this.campaignService.remove(id, userId);
  }

  /**
   * 캠페인을 발송합니다.
   */
  @Post(':id/send')
  @Roles(UserRole.ADMIN, UserRole.USER)
  @ApiOperation({ summary: '캠페인 발송' })
  @ApiResponse({ status: 200, description: '캠페인 발송이 시작됨' })
  @ApiResponse({ status: 404, description: '캠페인을 찾을 수 없음' })
  @ApiParam({ name: 'id', description: '캠페인 ID' })
  send(@Param('id') id: string, @CurrentUser() userId: string) {
    return this.campaignService.send(id, userId);
  }

  /**
   * 예약된 캠페인을 취소합니다.
   */
  @Post(':id/cancel')
  @Roles(UserRole.ADMIN, UserRole.USER)
  @ApiOperation({ summary: '예약된 캠페인 취소' })
  @ApiResponse({ status: 200, description: '캠페인이 성공적으로 취소됨' })
  @ApiResponse({ status: 404, description: '캠페인을 찾을 수 없음' })
  @ApiParam({ name: 'id', description: '캠페인 ID' })
  cancel(@Param('id') id: string, @CurrentUser() userId: string) {
    return this.campaignService.cancel(id, userId);
  }

  /**
   * 캠페인 수신자 목록을 조회합니다.
   */
  @Get(':id/recipients')
  @Roles(UserRole.ADMIN, UserRole.USER)
  @ApiOperation({ summary: '캠페인 수신자 목록 조회' })
  @ApiResponse({ status: 200, description: '수신자 목록 조회 성공' })
  @ApiResponse({ status: 404, description: '캠페인을 찾을 수 없음' })
  @ApiParam({ name: 'id', description: '캠페인 ID' })
  async getCampaignRecipients(@Param('id') id: string) {
    return this.campaignService.getCampaignRecipients(id);
  }

  /**
   * 캠페인 분석 데이터를 조회합니다.
   */
  @Get(':id/analytics')
  @Roles(UserRole.ADMIN, UserRole.USER)
  @ApiOperation({ summary: '캠페인 분석 데이터 조회' })
  @ApiResponse({ status: 200, description: '분석 데이터 조회 성공' })
  @ApiResponse({ status: 404, description: '캠페인을 찾을 수 없음' })
  @ApiParam({ name: 'id', description: '캠페인 ID' })
  async getCampaignAnalytics(@Param('id') id: string) {
    return this.campaignService.getCampaignAnalytics(id);
  }
}
