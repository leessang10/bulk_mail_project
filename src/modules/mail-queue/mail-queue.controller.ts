import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { MailQueueService } from './mail-queue.service';

@Controller('mail-queue')
@UseGuards(JwtAuthGuard)
export class MailQueueController {
  constructor(private readonly mailQueueService: MailQueueService) {}

  @Post('enqueue')
  enqueueCampaign(
    @Body('campaignId') campaignId: string,
    @CurrentUser() userId: string,
  ) {
    return this.mailQueueService.enqueueCampaign(campaignId, userId);
  }
}
