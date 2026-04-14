import * as tauriPath from '@tauri-apps/api/path';
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

function normalizePathForCompare(path: string): string {
  const replaced = path.replaceAll('\\', '/');
  const trimmed = replaced.replace(/\/+$/, '');
  return (trimmed || replaced).toLowerCase();
}

async function getProtectedDeleteRoots(): Promise<Set<string>> {
  const dirs = await ipc.getAppDirs();
  const roots = new Set<string>();
  const candidates = [dirs?.aviutl2_root, dirs?.aviutl2_data, dirs?.plugin_dir, dirs?.script_dir];
  for (const candidate of candidates) {
    if (typeof candidate === 'string' && candidate.trim()) {
      roots.add(normalizePathForCompare(candidate.trim()));
    }
  }
  return roots;
}

async function isFilesystemRoot(dirPath: string): Promise<boolean> {
  const parentDir = await tauriPath.dirname(dirPath);
  return normalizePathForCompare(parentDir) === normalizePathForCompare(dirPath);
}

async function removeEmptyDirectParentIfNeeded(absPath: string): Promise<void> {
  const parentDir = await tauriPath.dirname(absPath);
  if (!parentDir) return;
  if (await isFilesystemRoot(parentDir)) return;
  const protectedRoots = await getProtectedDeleteRoots();
  if (protectedRoots.has(normalizePathForCompare(parentDir))) return;
  const entries = await tauriFs.readDir(parentDir);
  if (entries.length !== 0) return;
  await tauriFs.remove(parentDir);
}

export async function deletePath(absPath: string): Promise<boolean> {
  const hasPath = await tauriFs.exists(absPath);
  if (!hasPath) {
    return false;
  }
  await tauriFs.remove(absPath, { recursive: true });
  try {
    await removeEmptyDirectParentIfNeeded(absPath);
  } catch (e: unknown) {
    await bestEffortLogError(`[deletePath] remove empty parent failed path="${absPath}": ${formatUnknownError(e)}`);
  }
  return true;
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
