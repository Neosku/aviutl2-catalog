import * as tauriWindow from '@tauri-apps/api/window';

export type AppMode = 'init' | 'main';

export function applyBootThemeInitClass(): void {
  const bootRoot = document?.documentElement;
  if (!bootRoot) return;
  bootRoot.classList.add('theme-init');
}

export async function showCurrentWindow(): Promise<void> {
  const win = tauriWindow.getCurrentWindow();
  await win.show();
  await win.setFocus();
}

export function getWindowMode(): AppMode {
  if (window.location.search.includes('window=init-setup')) return 'init';

  try {
    if (tauriWindow.getCurrentWindow().label === 'init-setup') return 'init';
  } catch {}
  return 'main';
}
