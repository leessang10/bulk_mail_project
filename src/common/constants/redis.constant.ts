export const REDIS_KEYS = {
  MAIL_QUEUE: 'bulk-mail:queue',
  CAMPAIGN_STATUS: 'bulk-mail:campaign:{id}:status',
  RECIPIENT_GROUP: 'bulk-mail:recipient:group:{groupId}',
  MAIL_ANALYTICS: 'bulk-mail:analytics:{campaignId}',
};

export const REDIS_CHANNELS = {
  MAIL_SENT: 'bulk-mail.event.mail_sent',
  MAIL_OPENED: 'bulk-mail.event.mail_opened',
  MAIL_CLICKED: 'bulk-mail.event.mail_clicked',
};
