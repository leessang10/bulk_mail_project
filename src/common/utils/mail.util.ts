import * as mjml2html from 'mjml';
import { MergeFields } from '../interfaces/mail.interface';

/**
 * MJML 코드를 HTML로 변환합니다.
 */
export function convertMjmlToHtml(mjmlContent: string): string {
  const result = mjml2html(mjmlContent);
  return result.html;
}

/**
 * 템플릿에 머지 필드를 적용합니다.
 */
export function processMergeFields(
  template: string,
  mergeFields: MergeFields,
): string {
  let result = template;

  // 모든 머지 필드를 순회하며 치환
  Object.entries(mergeFields).forEach(([key, value]) => {
    const placeholder = new RegExp(`{{${key}}}`, 'g');
    result = result.replace(placeholder, value?.toString() || '');
  });

  return result;
}

/**
 * 수신거부 링크를 생성합니다.
 */
export function generateUnsubscribeUrl(baseUrl: string, token: string): string {
  return `${baseUrl}/unsubscribe?token=${token}`;
}
