import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { CampaignStatus, UserRole } from '@prisma/client';
import { Roles } from '../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { CampaignService } from './campaign.service';
import { CreateCampaignDto } from './dto/create-campaign.dto';
import { UpdateCampaignStatusDto } from './dto/update-campaign-status.dto';

@Controller('campaigns')
@UseGuards(JwtAuthGuard, RolesGuard)
export class CampaignController {
  constructor(private readonly campaignService: CampaignService) {}

  /**
   * 새 캠페인을 생성합니다.
   */
  @Post()
  @Roles(UserRole.ADMIN, UserRole.USER)
  async create(@Body() createCampaignDto: CreateCampaignDto) {
    return this.campaignService.createCampaign(createCampaignDto);
  }

  /**
   * 모든 캠페인을 조회합니다.
   */
  @Get()
  @Roles(UserRole.ADMIN, UserRole.USER)
  async findAll(
    @Query('page') page = 1,
    @Query('limit') limit = 20,
    @Query('status') status?: CampaignStatus,
  ) {
    return this.campaignService.findAllCampaigns(+page, +limit, status);
  }

  /**
   * 특정 캠페인을 조회합니다.
   */
  @Get(':id')
  @Roles(UserRole.ADMIN, UserRole.USER)
  async findOne(@Param('id') id: string) {
    return this.campaignService.findCampaign(id);
  }

  /**
   * 캠페인 상태를 업데이트합니다.
   */
  @Patch(':id/status')
  @Roles(UserRole.ADMIN, UserRole.USER)
  async updateStatus(
    @Param('id') id: string,
    @Body() updateStatusDto: UpdateCampaignStatusDto,
  ) {
    return this.campaignService.updateCampaignStatus(id, updateStatusDto);
  }

  /**
   * 테스트 이메일을 발송합니다.
   */
  @Post(':id/test')
  @Roles(UserRole.ADMIN, UserRole.USER)
  async sendTestEmail(
    @Param('id') id: string,
    @Body('emails') emails: string[],
  ) {
    return this.campaignService.sendTestEmail(id, emails);
  }

  /**
   * 캠페인 수신자 목록을 조회합니다.
   */
  @Get(':id/recipients')
  @Roles(UserRole.ADMIN, UserRole.USER)
  async getCampaignRecipients(@Param('id') id: string) {
    return this.campaignService.getCampaignRecipients(id);
  }

  /**
   * 캠페인 분석 데이터를 조회합니다.
   */
  @Get(':id/analytics')
  @Roles(UserRole.ADMIN, UserRole.USER)
  async getCampaignAnalytics(@Param('id') id: string) {
    return this.campaignService.getCampaignAnalytics(id);
  }
}
