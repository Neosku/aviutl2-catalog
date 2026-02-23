import { formatUnknownError } from '../errors.js';
import { bestEffortLogError } from '../logging.js';

function isAbsPath(p: unknown): boolean {
  return /^(?:[a-zA-Z]:[\\/]|\\\\|\/)/.test(String(p || ''));
}

export function ensureAbsolutePath(p: unknown, label: string): string {
  const s = String(p || '');
  if (!isAbsPath(s)) {
    throw new Error(`${label} must be an absolute path: ${s}`);
  }
  return s;
}

export async function deletePath(absPath: string): Promise<boolean> {
  const fs = await import('@tauri-apps/plugin-fs');
  let ok = false;
  let lastErr: unknown = null;
  try {
    const exists = await fs.exists(absPath);
    if (!exists) {
      return false;
    }
    try {
      await fs.remove(absPath, { recursive: true });
      ok = true;
    } catch {
      try {
        const st = await fs.stat(absPath);
        if (st.isDirectory) {
          await fs.remove(absPath, { recursive: true });
        } else {
          await fs.remove(absPath);
        }
        ok = true;
      } catch (e: unknown) {
        lastErr = e;
      }
    }
    if (ok) return true;
  } catch (e: unknown) {
    lastErr = e;
  }
  if (!ok) throw lastErr || new Error('remove failed');
  return ok;
}

export async function extractZip(zipPath: string, destPath: string): Promise<void> {
  try {
    const { invoke } = await import('@tauri-apps/api/core');
    await invoke('extract_zip', { zipPath, destPath });
    return;
  } catch (e: unknown) {
    await bestEffortLogError(`[extractZip] failed: ${formatUnknownError(e)}`);
  }
}

export async function extractSevenZipSfx(sfxPath: string, destPath: string): Promise<void> {
  try {
    const { invoke } = await import('@tauri-apps/api/core');
    await invoke('extract_7z_sfx', { sfxPath, destPath });
    return;
  } catch (e: unknown) {
    await bestEffortLogError(`[extractSevenZipSfx] failed: ${formatUnknownError(e)}`);
  }
}

export async function copyPattern(fromPattern: string, toDirRel: string): Promise<number> {
  const { invoke } = await import('@tauri-apps/api/core');
  const result = await invoke('copy_item_js', { srcStr: fromPattern, dstStr: toDirRel });
  return typeof result === 'number' ? result : Number(result) || 0;
}
