import * as windowApi from '@tauri-apps/api/window';
import { logError } from '../../../../utils/logging';

export async function bringWindowToFront(): Promise<void> {
  try {
    const win = windowApi.getCurrentWindow();
    if (!win) return;

    if (typeof win.show === 'function') await win.show();
    if (typeof win.setFocus === 'function') await win.setFocus();
  } catch (error) {
    const detail = error instanceof Error ? error.message : String(error || '不明なエラー');
    void logError(`[deep-link] failed to bring window to front: ${detail}`).catch(() => {});
  }
}
