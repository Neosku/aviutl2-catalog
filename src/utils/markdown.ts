import { AlertCircle, AlertOctagon, AlertTriangle, createElement, IconNode, Info, Lightbulb } from 'lucide';
import { createMarkdownExit } from 'markdown-exit';
import githubAlerts, { MarkdownItGitHubAlertsOptions } from 'markdown-it-github-alerts';
import { codeToHtml as highlight } from 'shiki';

// sanitize-htmlの型が壊れているので正しい型を付与する
import * as untypedSanitize from 'sanitize-html';

const sanitize = untypedSanitize as unknown as Pick<typeof untypedSanitize, keyof typeof untypedSanitize> & {
  default: typeof untypedSanitize;
};

async function spawnHighlight(code: string, lang: string, nonce: string) {
  const highlighted = await highlight(code, { lang, theme: 'catppuccin-mocha' });
  while (true) {
    const el = document.querySelector(`pre[data-highlight-nonce="${nonce}"]`);
    if (!el) {
      await new Promise((resolve) => setTimeout(resolve, 50));
      continue;
    }
    el.outerHTML = highlighted;
    break;
  }
}

const md = createMarkdownExit({
  breaks: true,
  highlight(code, lang) {
    const nonce = Math.random().toString(36).slice(2);
    spawnHighlight(code, lang, nonce);
    return `<pre class="markdown-codeblock" data-highlight-nonce="${nonce}"><code class="language-${lang}">${code}</code></pre>`;
  },
});

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
    important: renderAlertIcon(AlertCircle),
    warning: renderAlertIcon(AlertTriangle),
    caution: renderAlertIcon(AlertOctagon),
  },
} satisfies MarkdownItGitHubAlertsOptions);

md.use((md) => {
  function doSanitize(html: string): string {
    return sanitize.default(html, {
      allowedTags: ['br', 'b', 'i', 'em', 'strong', 'a'],
      allowedAttributes: {
        a: ['href', 'target', 'rel'],
      },
      allowedSchemes: ['http', 'https', 'mailto'],
    });
  }
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
});

function resolveImageSrc(src: string, baseUrl?: string): string {
  if (!baseUrl) return src;
  try {
    const url = new URL(src, baseUrl);
    return url.href;
  } catch {
    return src;
  }
}
md.use((md) => {
  // 画像リンクを渡されたbaseUrlを基準に変換する。
  const defaultImageRenderer =
    md.renderer.rules.image || ((tokens, idx, options, _env, self) => self.renderToken(tokens, idx, options));
  md.renderer.rules.image = (tokens, idx, options, env, self) => {
    const token = tokens[idx];
    const srcIndex = token.attrIndex('src');
    if (srcIndex >= 0) {
      const src = token.attrs?.[srcIndex]?.[1] || '';
      const resolvedSrc = resolveImageSrc(src, env.baseUrl);
      token.attrs![srcIndex][1] = resolvedSrc;
    }
    return defaultImageRenderer(tokens, idx, options, env, self);
  };
});

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
    return sanitize
      .default(markdown, {
        allowedTags: false,
        allowedAttributes: false,
        allowedSchemes: false,
      })
      .replaceAll('\n', '<br>');
  }
}
