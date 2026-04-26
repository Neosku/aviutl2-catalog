import { useEffect, useState } from 'react';
import { loadMarkdown } from '@/utils/catalogClient';
import { renderMarkdown } from '@/utils/markdown';
import { isMarkdownFilePath, resolveMarkdownUrl } from '../../model/helpers';

interface UsePackageMarkdownParams {
  markdownSource?: string;
  baseUrl?: string;
  loadFailedMessage: string;
}

export default function usePackageMarkdown({ markdownSource, baseUrl, loadFailedMessage }: UsePackageMarkdownParams) {
  const [html, setHtml] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    const source = typeof markdownSource === 'string' ? markdownSource.trim() : '';

    if (!source) {
      setHtml('');
      setError('');
      setLoading(false);
      return;
    }

    if (!isMarkdownFilePath(source)) {
      setHtml(renderMarkdown(source));
      setError('');
      setLoading(false);
      return;
    }

    setLoading(true);
    setError('');

    void (async () => {
      try {
        const markdownText = await loadMarkdown(source, baseUrl || '');
        const resolvedBaseUrl = resolveMarkdownUrl(source, baseUrl || '');
        if (!cancelled) {
          setHtml(
            renderMarkdown(markdownText, {
              baseUrl: resolvedBaseUrl,
            }),
          );
        }
      } catch {
        if (!cancelled) {
          setHtml(renderMarkdown(loadFailedMessage));
          setError(loadFailedMessage);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [baseUrl, loadFailedMessage, markdownSource]);

  return {
    html,
    loading,
    error,
  };
}
