import { useEffect } from 'react';
import { logError } from '../utils/logging';
import { canOpenExternalLink, openExternalLink } from '../utils/externalLink';

function toLogText(error: unknown): string {
  if (error instanceof Error) return error.stack || error.message;
  return String(error ?? 'unknown');
}

function toElementTarget(target: EventTarget | null): Element | null {
  return target instanceof Element ? target : null;
}

export function useGlobalGuards(): void {
  useEffect(() => {
    const onContextMenu = (event: MouseEvent) => {
      const target = toElementTarget(event.target);
      if (target?.closest('.allow-contextmenu')) return;
      event.preventDefault();
    };
    window.addEventListener('contextmenu', onContextMenu);
    return () => window.removeEventListener('contextmenu', onContextMenu);
  }, []);

  useEffect(() => {
    const onError = async (event: ErrorEvent) => {
      try {
        const message = event.message || toLogText(event.error);
        await logError(`[window.error] ${message}`);
      } catch {}
    };
    const onRejection = async (event: PromiseRejectionEvent) => {
      const reason = event.reason;
      const message =
        (reason instanceof Error ? reason.message : reason != null ? String(reason) : '') ||
        String(reason || 'unhandled rejection');
      try {
        await logError(`[window.unhandledrejection] ${message}`);
      } catch {}
    };
    const originalConsoleError = console.error;
    console.error = (...args: unknown[]) => {
      try {
        originalConsoleError?.(...args);
      } catch {}
      try {
        const message = args.map((arg) => toLogText(arg)).join(' ');
        void logError(`[console.error] ${message}`);
      } catch {}
    };
    window.addEventListener('error', onError);
    window.addEventListener('unhandledrejection', onRejection);
    return () => {
      try {
        console.error = originalConsoleError;
      } catch {}
      window.removeEventListener('error', onError);
      window.removeEventListener('unhandledrejection', onRejection);
    };
  }, []);

  useEffect(() => {
    const onClick = (event: MouseEvent) => {
      const target = toElementTarget(event.target);
      if (!target) return;
      const anchor = target.closest('.md a[href]');
      if (!(anchor instanceof HTMLAnchorElement) || event.defaultPrevented) return;
      const rawHref = anchor.getAttribute('href') || '';
      if (!canOpenExternalLink(rawHref)) return;
      event.preventDefault();
      void openExternalLink(rawHref);
    };
    document.addEventListener('click', onClick);
    return () => document.removeEventListener('click', onClick);
  }, []);
}
