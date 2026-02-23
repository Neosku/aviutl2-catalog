import { getCurrentWindow } from '@tauri-apps/api/window';
import { formatUnknownError } from '../utils/errors';
import { logError } from '../utils/logging';

export type AppMode = 'loading' | 'init' | 'main';

export function applyBootThemeInitClass(): void {
  const bootRoot = document?.documentElement;
  if (!bootRoot) return;
  bootRoot.classList.add('dark');
  bootRoot.classList.add('theme-init');
}

async function showMainWindow(): Promise<void> {
  const win = getCurrentWindow();
  await win.show();
  await win.setFocus();
}

export function scheduleMainWindowReveal(): void {
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

export async function detectWindowLabel(): Promise<string> {
  try {
    const win = getCurrentWindow() as { label?: unknown };
    if (typeof win.label === 'string' && win.label) return win.label;
    if (typeof win.label === 'function') {
      try {
        const value = await win.label();
        return typeof value === 'string' && value ? value : 'main';
      } catch {
        return 'main';
      }
    }
  } catch (error: unknown) {
    try {
      await logError(`[bootstrap] detectWindowLabel failed: ${formatUnknownError(error)}`);
    } catch {}
  }
  return 'main';
}
