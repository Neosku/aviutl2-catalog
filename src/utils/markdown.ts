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
    return rendered;
  } catch {
    return escapeHtml(markdown).replaceAll('\n', '<br>');
  }
}
