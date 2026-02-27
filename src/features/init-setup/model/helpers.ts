import * as windowApi from '@tauri-apps/api/window';
import { logError } from '../../../utils/logging';

async function showMainWindow() {
  const win = windowApi.getCurrentWindow();
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
    const win = windowApi.getCurrentWindow();
    return String(win.label || '');
  } catch (error) {
    await safeLog('[init-window] get label failed', error);
    return '';
  }
}
