import { marked } from 'marked';

function escapeHtml(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

export function renderMarkdown(md = '') {
  if (!md) return '';
  const text = String(md).replace(/\r\n?/g, '\n');
  // 生の HTML は受け付けず、Markdown のみをパースするために一旦エスケープ
  const escaped = escapeHtml(text);
  marked.setOptions({ mangle: false, headerIds: false, breaks: true, gfm: true });
  try {
    return marked.parse(escaped);
  } catch (_) {
    // パース失敗時は簡易フォールバック
    return escaped.replace(/\n/g, '<br/>');
  }
}

