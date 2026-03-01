import { codeToHtml as shiki } from 'shiki';
import { escapeHtml } from '../escapeHtml';

const HIGHLIGHT_POLL_INTERVAL_MS = 50;
const HIGHLIGHT_MAX_POLL_ATTEMPTS = 100;

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function spawnHighlight(code: string, lang: string, nonce: string) {
  try {
    const highlighted = await shiki(code, { lang, theme: 'catppuccin-mocha' });
    for (let attempt = 0; attempt < HIGHLIGHT_MAX_POLL_ATTEMPTS; attempt += 1) {
      const el = document.querySelector(`pre[data-highlight-nonce="${nonce}"]`);
      if (el) {
        el.outerHTML = highlighted;
        return;
      }
      await sleep(HIGHLIGHT_POLL_INTERVAL_MS);
    }
  } catch {}
}

/** shikiでコードを非同期的にハイライトする。 */
export function highlight(code: string, lang: string): string {
  const nonce = Math.random().toString(36).slice(2);
  void spawnHighlight(code, lang, nonce);
  return `<pre class="markdown-codeblock" data-highlight-nonce="${nonce}"><code class="language-${escapeHtml(lang)}">${escapeHtml(code)}</code></pre>`;
}
