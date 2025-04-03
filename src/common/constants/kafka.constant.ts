export const KAFKA_TOPICS = {
  MAIL_SEND: 'bulk-mail.mail.send',
  MAIL_STATUS: 'bulk-mail.mail.status',
  MAIL_EVENT: 'bulk-mail.mail.event',
  MAIL_QUEUE: 'bulk-mail.mail.queue',
} as const;

export const CONSUMER_GROUPS = {
  MAIL_PROCESSOR: 'bulk-mail-mail-processor',
  EVENT_PROCESSOR: 'bulk-mail-event-processor',
} as const;
