import { logError } from '../../../utils/index.js';

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

interface WindowModule {
  getCurrent?: () => TauriWindowLike;
  getCurrentWindow?: () => TauriWindowLike;
  appWindow?: TauriWindowLike;
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
    const mod = (await import('@tauri-apps/api/window')) as WindowModule;
    if (typeof mod.getCurrent === 'function') return mod.getCurrent();
    if (typeof mod.getCurrentWindow === 'function') return mod.getCurrentWindow();
    if (mod?.appWindow) return mod.appWindow;
  } catch (error) {
    await logTitleBarError(`window module load failed: ${toErrorText(error)}`);
  }
  return null;
}

async function loadFromWebviewWindowModule(): Promise<TauriWindowLike | null> {
  try {
    const mod = (await import('@tauri-apps/api/webviewWindow')) as {
      getCurrent?: () => TauriWindowLike;
    };
    if (typeof mod.getCurrent === 'function') return mod.getCurrent();
  } catch (error) {
    await logTitleBarError(`webviewWindow module load failed: ${toErrorText(error)}`);
  }
  return null;
}

export async function getCurrentTauriWindow(): Promise<TauriWindowLike | null> {
  const windowFromApi = await loadFromWindowModule();
  if (windowFromApi) return windowFromApi;
  return loadFromWebviewWindowModule();
}
