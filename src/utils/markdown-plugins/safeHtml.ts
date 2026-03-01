import { MarkdownExit } from 'markdown-exit';
import sanitizeHtml from '../sanitizeHtml';

export function doSanitize(html: string): string {
  return sanitizeHtml.default(html, {
    allowedTags: ['br', 'b', 'i', 'em', 'strong', 'a'],
    allowedAttributes: {
      a: ['href', 'target', 'rel'],
    },
    allowedSchemes: ['http', 'https', 'mailto'],
  });
}

/** 一部のHTMLタグを許可する。 */
export function safeHtml(md: MarkdownExit): void {
  md.renderer.rules.html_block = (tokens, idx) => {
    const rawHtml = tokens[idx].content;
    const sanitized = doSanitize(rawHtml);
    return sanitized;
  };
  md.renderer.rules.html_inline = (tokens, idx) => {
    const rawHtml = tokens[idx].content;
    const sanitized = doSanitize(rawHtml);
    return sanitized;
  };
}
