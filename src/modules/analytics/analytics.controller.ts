import { Controller, Get, Param, UseGuards } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { UserRole } from '@prisma/client';
import { Roles } from '../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { AnalyticsService } from './analytics.service';

@ApiTags('analytics')
@Controller('analytics')
@UseGuards(JwtAuthGuard, RolesGuard)
export class AnalyticsController {
  constructor(private readonly analyticsService: AnalyticsService) {}

  /**
   * 캠페인의 전체 성과 지표를 조회합니다.
   */
  @Get('campaigns/:id/performance')
  @Roles(UserRole.ADMIN, UserRole.USER)
  @ApiOperation({ summary: '캠페인 성과 지표 조회' })
  getCampaignPerformance(@Param('id') id: string) {
    return this.analyticsService.getCampaignPerformance(id);
  }

  /**
   * 시간대별 이메일 성과를 분석합니다.
   */
  @Get('campaigns/:id/hourly')
  @Roles(UserRole.ADMIN, UserRole.USER)
  @ApiOperation({ summary: '시간대별 성과 분석' })
  getHourlyPerformance(@Param('id') id: string) {
    return this.analyticsService.getHourlyPerformance(id);
  }

  /**
   * 수신자 그룹별 성과를 분석합니다.
   */
  @Get('campaigns/:id/groups')
  @Roles(UserRole.ADMIN, UserRole.USER)
  @ApiOperation({ summary: '그룹별 성과 분석' })
  getGroupPerformance(@Param('id') id: string) {
    return this.analyticsService.getGroupPerformance(id);
  }
}
