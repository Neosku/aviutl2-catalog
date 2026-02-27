import * as windowApi from '@tauri-apps/api/window';
import { logError } from '../../../utils/logging';

export interface TauriWindowLike {
  isMaximized?: () => Promise<boolean>;
  minimize?: () => Promise<void>;
  maximize?: () => Promise<void>;
  unmaximize?: () => Promise<void>;
  close?: () => Promise<void>;
  startDragging?: () => Promise<void>;
  onResized?: (handler: () => void | Promise<void>) => Promise<(() => void) | void>;
  onMoved?: (handler: () => void | Promise<void>) => Promise<(() => void) | void>;
  onFocusChanged?: (handler: () => void | Promise<void>) => Promise<(() => void) | void>;
  onScaleChanged?: (handler: () => void | Promise<void>) => Promise<(() => void) | void>;
}

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

async function loadFromWindowModule(): Promise<TauriWindowLike | null> {
  try {
    return windowApi.getCurrentWindow();
  } catch (error) {
    await logTitleBarError(`window module load failed: ${toErrorText(error)}`);
  }
  return null;
}

export async function getCurrentTauriWindow(): Promise<TauriWindowLike | null> {
  return loadFromWindowModule();
}
