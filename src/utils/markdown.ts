import { createMarkdownExit } from 'markdown-exit';
import { escapeHtml } from './escapeHtml';
import { highlight } from './markdown-plugins/highlight';
import { safeHtml } from './markdown-plugins/safeHtml';
import { resolveGithubLink } from './markdown-plugins/githubLink';
import { alertBlock } from './markdown-plugins/alertBlock';
import { fixImageUrl } from './markdown-plugins/fixImageUrl';

const md = createMarkdownExit({
  html: true,
  breaks: true,
  highlight,
});
md.use(safeHtml);
md.use(resolveGithubLink);
md.use(alertBlock);
md.use(fixImageUrl);

function normalizeBadgeParagraphs(html: string): string {
  return html.replace(/<p>([\s\S]*?)<\/p>/g, (paragraph, content) => {
    const badgeLinks = content.match(/<a\b[^>]*>\s*<img\b[^>]*>\s*<\/a>/gi) || [];
    if (badgeLinks.length === 0) return paragraph;

    const normalized = content
      .replace(/<br\s*\/?>/gi, '')
      .replace(/<a\b[^>]*>\s*<img\b[^>]*>\s*<\/a>/gi, '')
      .trim();
    if (normalized) return paragraph;

    return `<p class="markdown-badges">${badgeLinks.join('')}</p>`;
  });
}

export function renderMarkdown(
  markdown: string,
  options: {
    baseUrl?: string;
  } = {},
): string {
  if (!markdown) return '';
  try {
    const rendered = md
      .render(markdown, {
        baseUrl: options.baseUrl,
      })
      .trim();
    return normalizeBadgeParagraphs(rendered);
  } catch {
    return escapeHtml(markdown).replaceAll('\n', '<br>');
  }
}
