import { getCurrentWindow } from '@tauri-apps/api/window';
import { logError } from '../../../utils/index.js';

async function showMainWindow() {
  const win = getCurrentWindow();
  await win.show();
  await win.setFocus();
}

export function ensureInitWindowVisible() {
  if (document.readyState === 'loading') {
    window.addEventListener(
      'DOMContentLoaded',
      () => {
        void showMainWindow();
      },
      { once: true },
    );
    return;
  }
  void showMainWindow();
}

export function getErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  if (typeof error === 'string') return error;
  if (error && typeof error === 'object' && 'message' in error) {
    const message = (error as { message?: unknown }).message;
    if (typeof message === 'string') return message;
  }
  try {
    return String(error ?? '');
  } catch {
    return '';
  }
}

export async function safeLog(prefix: string, error: unknown) {
  try {
    const detail = getErrorMessage(error);
    const message = detail ? `${prefix}: ${detail}` : prefix;
    await logError(message);
  } catch {
    // ignore secondary logging failure
  }
}

export async function fetchWindowLabel() {
  try {
    const mod = (await import('@tauri-apps/api/window')) as {
      getCurrent?: () => unknown;
      getCurrentWindow?: () => unknown;
      appWindow?: unknown;
    };
    const getCurrent =
      typeof mod.getCurrent === 'function'
        ? mod.getCurrent
        : typeof mod.getCurrentWindow === 'function'
          ? mod.getCurrentWindow
          : null;
    const win = (getCurrent ? getCurrent() : mod.appWindow || null) as {
      label?: string | (() => Promise<unknown>) | (() => unknown);
    } | null;
    if (!win) return '';
    if (typeof win.label === 'string') return win.label;
    if (typeof win.label === 'function') {
      const value = await win.label();
      return typeof value === 'string' ? value : String(value ?? '');
    }
    return '';
  } catch (error) {
    await safeLog('[init-window] get label failed', error);
    return '';
  }
}
