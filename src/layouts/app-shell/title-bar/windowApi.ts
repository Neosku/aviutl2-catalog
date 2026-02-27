import * as windowApi from '@tauri-apps/api/window';
import { logError } from '../../../utils/logging';

function toErrorText(error: unknown): string {
  if (error instanceof Error && error.message) return error.message;
  return String(error ?? 'unknown');
}

async function logTitleBarError(message: string): Promise<void> {
  try {
    await logError(`[titlebar] ${message}`);
  } catch {}
}

export async function reportTitleBarActionError(action: string, error: unknown): Promise<void> {
  await logTitleBarError(`${action} failed: ${toErrorText(error)}`);
}

export async function getCurrentTauriWindow(): Promise<windowApi.Window | null> {
  try {
    return windowApi.getCurrentWindow();
  } catch (error) {
    await logTitleBarError(`window module load failed: ${toErrorText(error)}`);
  }
  return null;
}

export { Window as TauriWindow } from '@tauri-apps/api/window';
