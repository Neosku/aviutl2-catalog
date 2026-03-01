import { codeToHtml as shiki } from 'shiki';

async function spawnHighlight(code: string, lang: string, nonce: string) {
  const highlighted = await shiki(code, { lang, theme: 'catppuccin-mocha' });
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

/** shikiでコードを非同期的にハイライトする。 */
export function highlight(code: string, lang: string): string {
  const nonce = Math.random().toString(36).slice(2);
  spawnHighlight(code, lang, nonce);
  return `<pre class="markdown-codeblock" data-highlight-nonce="${nonce}"><code class="language-${lang}">${code}</code></pre>`;
}
