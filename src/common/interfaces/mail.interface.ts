/**
 * 메일 머지 필드 인터페이스
 */
export interface MergeFields {
  [key: string]: string | number | boolean | null | undefined;
}

/**
 * 메일 전송 결과 인터페이스
 */
export interface MailSendResult {
  messageId?: string;
  success: boolean;
  error?: Error;
}

/**
 * 메일 템플릿 인터페이스
 */
export interface MailTemplate {
  id: string;
  name: string;
  mjmlContent: string;
  version: number;
}
