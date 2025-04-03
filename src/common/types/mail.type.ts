/**
 * 메일 발송 결과
 */
export interface MailSendResult {
  success: boolean;
  messageId?: string;
  error?: any;
}

/**
 * 이메일 템플릿에 사용되는 머지 필드 타입
 */
export interface MergeFields {
  [key: string]: any;
  name?: string;
  email?: string;
  unsubscribeUrl?: string;
}
