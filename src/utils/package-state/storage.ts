import type { ZodTypeAny } from 'zod';
import { formatUnknownError } from '../errors';
import { logError } from '../logging';
import {
  PACKAGE_STATE_META_FILE,
  PACKAGE_STATE_PENDING_FILE,
  packageStateMetaFileSchema,
  packageStateQueueFileSchema,
  type PackageStateEvent,
  type PackageStateMeta,
} from './types';

async function readAppConfigJson<T>(relPath: string, fallback: T, schema: ZodTypeAny | null = null): Promise<T> {
  const fs = await import('@tauri-apps/plugin-fs');
  try {
    const exists = await fs.exists(relPath, { baseDir: fs.BaseDirectory.AppConfig });
    if (!exists) return fallback;
    const raw = await fs.readTextFile(relPath, { baseDir: fs.BaseDirectory.AppConfig });
    const trimmed = typeof raw === 'string' ? raw.trim() : '';
    if (!trimmed) return fallback;
    const parsed = JSON.parse(raw);
    if (schema) {
      const validated = schema.safeParse(parsed);
      if (validated.success) {
        return validated.data as T;
      }
      try {
        await logError(`[package-state] invalid JSON shape in ${relPath}`);
      } catch {}
      return fallback;
    }
    return parsed ?? fallback;
  } catch (e: unknown) {
    try {
      await logError(`[package-state] read ${relPath} failed: ${formatUnknownError(e)}`);
    } catch {}
    return fallback;
  }
}

async function writeAppConfigJson(relPath: string, data: unknown): Promise<void> {
  const fs = await import('@tauri-apps/plugin-fs');
  try {
    await fs.writeTextFile(relPath, JSON.stringify(data, null, 2), { baseDir: fs.BaseDirectory.AppConfig });
  } catch (e: unknown) {
    try {
      await logError(`[package-state] write ${relPath} failed: ${formatUnknownError(e)}`);
    } catch {}
  }
}

export async function removeAppConfigFile(relPath: string): Promise<void> {
  const fs = await import('@tauri-apps/plugin-fs');
  try {
    const exists = await fs.exists(relPath, { baseDir: fs.BaseDirectory.AppConfig });
    if (!exists) return;
    await fs.remove(relPath, { baseDir: fs.BaseDirectory.AppConfig });
  } catch (e: unknown) {
    try {
      await logError(`[package-state] remove ${relPath} failed: ${formatUnknownError(e)}`);
    } catch {}
  }
}

function normalizePackageStateMeta(raw: unknown): PackageStateMeta {
  const parsed = packageStateMetaFileSchema.safeParse(raw);
  if (!parsed.success) {
    return { uid: '', last_snapshot_ts: 0 };
  }
  const uid = parsed.data.uid || '';
  const rawTs = parsed.data.last_snapshot_ts;
  const ts = typeof rawTs === 'number' && Number.isFinite(rawTs) ? rawTs : 0;
  return { uid, last_snapshot_ts: ts };
}

export async function loadPackageStateMeta(): Promise<PackageStateMeta> {
  const raw = await readAppConfigJson(PACKAGE_STATE_META_FILE, {}, packageStateMetaFileSchema);
  return normalizePackageStateMeta(raw);
}

export async function savePackageStateMeta(meta: PackageStateMeta): Promise<PackageStateMeta> {
  const normalized = normalizePackageStateMeta(meta || {});
  await writeAppConfigJson(PACKAGE_STATE_META_FILE, normalized);
  return normalized;
}

export async function loadPackageStateQueue(): Promise<PackageStateEvent[]> {
  return await readAppConfigJson(PACKAGE_STATE_PENDING_FILE, [] as PackageStateEvent[], packageStateQueueFileSchema);
}

export async function savePackageStateQueue(queue: PackageStateEvent[]): Promise<PackageStateEvent[]> {
  const list = Array.isArray(queue) ? queue : [];
  if (!list.length) {
    await removeAppConfigFile(PACKAGE_STATE_PENDING_FILE);
    return [];
  }
  await writeAppConfigJson(PACKAGE_STATE_PENDING_FILE, list);
  return list;
}
