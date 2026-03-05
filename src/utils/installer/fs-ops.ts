import * as tauriFs from '@tauri-apps/plugin-fs';
import { formatUnknownError } from '../errors';
import { ipc } from '../invokeIpc';
import { bestEffortLogError } from '../logging';

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
  let ok = false;
  let lastErr: unknown = null;
  try {
    const hasPath = await tauriFs.exists(absPath);
    if (!hasPath) {
      return false;
    }
    try {
      await tauriFs.remove(absPath, { recursive: true });
      ok = true;
    } catch {
      try {
        const st = await tauriFs.stat(absPath);
        if (st.isDirectory) {
          await tauriFs.remove(absPath, { recursive: true });
        } else {
          await tauriFs.remove(absPath);
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
    await ipc.extractZip({ zipPath, destPath });
    return;
  } catch (e: unknown) {
    await bestEffortLogError(`[extractZip] failed: ${formatUnknownError(e)}`);
    throw e;
  }
}

export async function extractSevenZipSfx(sfxPath: string, destPath: string): Promise<void> {
  try {
    await ipc.extract7zSfx({ sfxPath, destPath });
    return;
  } catch (e: unknown) {
    await bestEffortLogError(`[extractSevenZipSfx] failed: ${formatUnknownError(e)}`);
    throw e;
  }
}

export async function copyPattern(fromPattern: string, toDirRel: string): Promise<number> {
  const result = await ipc.copyItemJs({ srcStr: fromPattern, dstStr: toDirRel });
  return typeof result === 'number' ? result : Number(result) || 0;
}
