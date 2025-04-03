import { CampaignStatus } from '@prisma/client';

export class Campaign {
  id: string;
  name: string;
  subject: string;
  senderEmail?: string;
  senderName?: string;
  templateId: string;
  status: CampaignStatus;
  scheduledAt?: Date;
  sentAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}
