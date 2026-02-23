import { formatUnknownError } from '../errors.js';
import { logError } from '../logging.js';

export async function ensureAviutlClosed(): Promise<void> {
  let running = false;
  try {
    const { invoke } = await import('@tauri-apps/api/core');
    running = !!(await invoke('is_aviutl_running'));
  } catch (e: unknown) {
    const detail = formatUnknownError(e) || '不明なエラー';
    try {
      await logError(`[process-check] failed to query process state: ${detail}`);
    } catch {}
    throw new Error(`AviUtl2の起動状況を確認できませんでした: ${detail}`, { cause: e });
  }
  if (running) {
    try {
      await logError('[process-check] aviutl2.exe is running; aborting operation.');
    } catch {}
    throw new Error('AviUtl2 が起動中です。\nインストールやアンインストールを行う前にアプリを終了してください。');
  }
}
