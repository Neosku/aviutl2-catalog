import { createBundledHighlighter } from 'shiki/core';
import { createJavaScriptRegexEngine } from 'shiki/engine/javascript';
import { escapeHtml } from '../escapeHtml';

const HIGHLIGHT_POLL_INTERVAL_MS = 50;
const HIGHLIGHT_MAX_POLL_ATTEMPTS = 100;
const HIGHLIGHT_THEME = 'dark-plus';

type HighlightLanguage = 'json' | 'jsonc' | 'lua' | 'markdown' | 'powershell' | 'toml';

const supportedLanguageAliases: Record<string, HighlightLanguage> = {
  json: 'json',
  jsonc: 'jsonc',
  lua: 'lua',
  markdown: 'markdown',
  md: 'markdown',
  powershell: 'powershell',
  ps: 'powershell',
  ps1: 'powershell',
  toml: 'toml',
};

const createHighlighter = createBundledHighlighter<HighlightLanguage, typeof HIGHLIGHT_THEME>({
  langs: {
    json: () => import('shiki/dist/langs/json.mjs'),
    jsonc: () => import('shiki/dist/langs/jsonc.mjs'),
    lua: () => import('shiki/dist/langs/lua.mjs'),
    markdown: () => import('shiki/dist/langs/markdown.mjs'),
    powershell: () => import('shiki/dist/langs/powershell.mjs'),
    toml: () => import('shiki/dist/langs/toml.mjs'),
  },
  themes: {
    [HIGHLIGHT_THEME]: () => import('shiki/dist/themes/dark-plus.mjs'),
  },
  engine: () => createJavaScriptRegexEngine(),
});

let highlighterPromise: ReturnType<typeof createHighlighter> | null = null;

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function normalizeLanguage(lang: string): HighlightLanguage | null {
  const normalized = lang.trim().toLowerCase();
  return supportedLanguageAliases[normalized] ?? null;
}

function getHighlighter(): ReturnType<typeof createHighlighter> {
  highlighterPromise ??= createHighlighter({
    langs: ['json', 'jsonc', 'lua', 'markdown', 'powershell', 'toml'],
    themes: [HIGHLIGHT_THEME],
  });
  return highlighterPromise;
}

async function spawnHighlight(code: string, lang: string, nonce: string) {
  const normalizedLang = normalizeLanguage(lang);
  if (!normalizedLang) return;

  try {
    const highlighter = await getHighlighter();
    const highlighted = highlighter.codeToHtml(code, { lang: normalizedLang, theme: HIGHLIGHT_THEME });
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
  return `<pre data-highlight-nonce="${nonce}"><code class="language-${escapeHtml(lang)}">${escapeHtml(code)}</code></pre>`;
}
