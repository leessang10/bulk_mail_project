import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { CampaignStatus } from '@prisma/client';
import { CampaignService } from './campaign.service';
import { CreateCampaignDto } from './dto/create-campaign.dto';
import { UpdateCampaignStatusDto } from './dto/update-campaign-status.dto';

@Controller('campaigns')
export class CampaignController {
  constructor(private readonly campaignService: CampaignService) {}

  /**
   * 새 캠페인을 생성합니다.
   */
  @Post()
  async create(@Body() createCampaignDto: CreateCampaignDto) {
    return this.campaignService.createCampaign(createCampaignDto);
  }

  /**
   * 모든 캠페인을 조회합니다.
   */
  @Get()
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
  async findOne(@Param('id') id: string) {
    return this.campaignService.findCampaign(id);
  }

  /**
   * 캠페인 상태를 업데이트합니다.
   */
  @Patch(':id/status')
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
  async getCampaignRecipients(@Param('id') id: string) {
    return this.campaignService.getCampaignRecipients(id);
  }

  /**
   * 캠페인 분석 데이터를 조회합니다.
   */
  @Get(':id/analytics')
  async getCampaignAnalytics(@Param('id') id: string) {
    return this.campaignService.getCampaignAnalytics(id);
  }
}
