import { logError } from '../../../../utils/index.js';

interface AppWindow {
  show?: () => void | Promise<void>;
  setFocus?: () => void | Promise<void>;
}

interface WindowModule {
  getCurrent?: () => AppWindow;
  getCurrentWindow?: () => AppWindow;
  appWindow?: AppWindow;
}

export async function bringWindowToFront(): Promise<void> {
  try {
    const mod = (await import('@tauri-apps/api/window')) as WindowModule;
    const getCurrent =
      typeof mod.getCurrent === 'function'
        ? mod.getCurrent
        : typeof mod.getCurrentWindow === 'function'
          ? mod.getCurrentWindow
          : null;

    const win = getCurrent ? getCurrent() : mod.appWindow || null;
    if (!win) return;

    if (typeof win.show === 'function') await win.show();
    if (typeof win.setFocus === 'function') await win.setFocus();
  } catch (error) {
    const detail = error instanceof Error ? error.message : String(error || '不明なエラー');
    void logError(`[deep-link] failed to bring window to front: ${detail}`).catch(() => {});
  }
}
