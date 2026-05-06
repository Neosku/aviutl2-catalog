/**
 * Markdown プレビュー
 */
import { useDeferredValue, useEffect, useState } from 'react';
import type { RegisterMarkdownTab } from '../types';

export default function useMarkdownPreview(markdownText: string, tab: RegisterMarkdownTab) {
  const [previewHtml, setPreviewHtml] = useState('');
  const deferredMarkdownText = useDeferredValue(tab === 'preview' ? markdownText : '');

  useEffect(() => {
    if (tab !== 'preview') {
      setPreviewHtml('');
      return;
    }
    const text = deferredMarkdownText;
    let cancelled = false;
    let idleId: number | null = null;
    let timeoutId: ReturnType<typeof setTimeout> | null = null;
    const run = () => {
      if (cancelled) return;
      void (async () => {
        const { renderMarkdown } = await import('@/utils/markdown');
        if (!cancelled) {
          setPreviewHtml(renderMarkdown(text));
        }
      })();
    };
    // Defer rendering so typing stays responsive for long Markdown bodies.
    if (typeof requestIdleCallback === 'function') {
      idleId = requestIdleCallback(run, { timeout: 500 });
    } else {
      timeoutId = setTimeout(run, 200);
    }
    return () => {
      cancelled = true;
      if (idleId != null && typeof cancelIdleCallback === 'function') {
        cancelIdleCallback(idleId);
      }
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, [tab, deferredMarkdownText]);

  return previewHtml;
}
