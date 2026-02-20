import { useCallback, useEffect, useRef } from 'react';
import type { NavigateFunction } from 'react-router-dom';
import { logError } from '../../../../utils/index.js';
import { bringWindowToFront } from './bringWindowToFront';
import { isAllowedInternalPath, parseDeepLink } from '../../model/deepLinkParser';

const DUPLICATE_IGNORE_MS = 1200;
const HISTORY_TTL_MS = 10000;

interface DeepLinkModule {
  getCurrent?: () => Promise<string[] | string>;
  onOpenUrl?: (handler: (urls: string[] | string) => void) => Promise<() => void>;
}

function toErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  return String(error || '不明なエラー');
}

function reportDeepLinkError(context: string, error: unknown) {
  void logError(`[deep-link] ${context}: ${toErrorMessage(error)}`).catch(() => {});
}

function toUrlList(urls: unknown): string[] {
  if (typeof urls === 'string') return [urls];
  if (Array.isArray(urls)) return urls.filter((value): value is string => typeof value === 'string');
  return [];
}

export default function useDeepLinkHandler(navigate: NavigateFunction) {
  const navigateRef = useRef(navigate);
  const recentUrlsRef = useRef<Map<string, number>>(new Map());

  useEffect(() => {
    navigateRef.current = navigate;
  }, [navigate]);

  const handleUrls = useCallback((urls: unknown) => {
    const list = toUrlList(urls);
    if (!list.length) return;

    const now = Date.now();
    list.forEach((raw) => {
      const trimmed = raw.trim();
      if (!trimmed) return;

      const recent = recentUrlsRef.current;
      const lastSeen = recent.get(trimmed);
      if (lastSeen && now - lastSeen < DUPLICATE_IGNORE_MS) return;

      recent.set(trimmed, now);
      for (const [key, ts] of recent) {
        if (now - ts > HISTORY_TTL_MS) recent.delete(key);
      }

      const action = parseDeepLink(trimmed);
      if (!action) return;

      if (!isAllowedInternalPath(action.internalPath)) {
        void logError(`[deep-link] ignored url=${action.rawUrl} path=${action.internalPath}`).catch(() => {});
        return;
      }

      void bringWindowToFront();
      try {
        navigateRef.current(action.internalUrl);
      } catch (error) {
        reportDeepLinkError('navigation failed', error);
      }
    });
  }, []);

  useEffect(() => {
    let unlisten: (() => void) | undefined;
    let cancelled = false;

    (async () => {
      try {
        const mod = (await import('@tauri-apps/plugin-deep-link')) as DeepLinkModule;

        if (typeof mod.getCurrent === 'function') {
          const current = await mod.getCurrent();
          if (!cancelled) handleUrls(current);
        }

        if (typeof mod.onOpenUrl === 'function') {
          unlisten = await mod.onOpenUrl((urls) => {
            if (cancelled) return;
            handleUrls(urls);
          });
        }
      } catch (error) {
        reportDeepLinkError('failed to initialize deep-link listener', error);
      }
    })();

    return () => {
      cancelled = true;
      if (typeof unlisten === 'function') {
        try {
          unlisten();
        } catch (error) {
          reportDeepLinkError('failed to cleanup deep-link listener', error);
        }
      }
    };
  }, [handleUrls]);
}
