import { AlertOctagon, AlertTriangle, createElement, IconNode, Info, Lightbulb, MessageSquareWarning } from 'lucide';
import { MarkdownExit } from 'markdown-exit';
import githubAlerts, { MarkdownItGitHubAlertsOptions } from 'markdown-it-github-alerts';

function renderAlertIcon(iconNode: IconNode): string {
  const svgString = createElement(iconNode, {
    size: 16,
    strokeWidth: 1.8,
    'aria-hidden': 'true',
    role: 'presentation',
    'data-is-alert-icon': 'true',
  });
  return svgString.outerHTML;
}

/** GitHubのアラートつきコードブロック */
export function alertBlock(md: MarkdownExit): void {
  md.use(githubAlerts, {
    titles: {
      note: '注記',
      tip: 'ヒント',
      important: '重要',
      warning: '警告',
      caution: '注意',
    },
    icons: {
      note: renderAlertIcon(Info),
      tip: renderAlertIcon(Lightbulb),
      important: renderAlertIcon(MessageSquareWarning),
      warning: renderAlertIcon(AlertTriangle),
      caution: renderAlertIcon(AlertOctagon),
    },
  } satisfies MarkdownItGitHubAlertsOptions);
}
