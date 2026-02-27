import { formatUnknownError } from '../errors';
import { ipc } from '../invokeIpc';
import { logError } from '../logging';

export async function ensureAviutlClosed(): Promise<void> {
  let running = false;
  try {
    running = !!(await ipc.isAviutlRunning());
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
