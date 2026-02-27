import * as tauriFs from '@tauri-apps/plugin-fs';
import * as z from 'zod';
import { formatUnknownError } from './errors';
import { ipc } from './invokeIpc';
import { logError } from './logging';
import { InstallerRunnableItem } from './installer/types';

const INSTALLED_FILE = 'installed.json';
const stringMapSchema = z.record(z.string(), z.unknown()).transform((value): Record<string, string> => {
  const normalized: Record<string, string> = {};
  Object.entries(value).forEach(([key, raw]) => {
    normalized[key] = typeof raw === 'string' ? raw : '';
  });
  return normalized;
});

export async function loadInstalledMap(): Promise<Record<string, string>> {
  try {
    const raw = await ipc.getInstalledMapCmd();
    const parsed = stringMapSchema.safeParse(raw);
    if (parsed.success) {
      return parsed.data;
    }
    try {
      await logError('[loadInstalledMap] invalid response shape from get_installed_map_cmd');
    } catch {}
    return {};
  } catch (e: unknown) {
    await logError(`[loadInstalledMap] invoke fallback: ${formatUnknownError(e)}`);
    return {};
  }
}

async function writeInstalledMap(map: Record<string, string>): Promise<Record<string, string>> {
  try {
    await tauriFs.writeTextFile(INSTALLED_FILE, JSON.stringify(map, null, 2), {
      baseDir: tauriFs.BaseDirectory.AppConfig,
    });
  } catch (e: unknown) {
    try {
      await logError(`[writeInstalledMap] failed: ${formatUnknownError(e)}`);
    } catch {}
  }
  return map;
}

export async function addInstalledId(id: string, version: string = ''): Promise<void> {
  try {
    await ipc.addInstalledIdCmd({ id, version: String(version || '') });
  } catch (e: unknown) {
    try {
      await logError(`[addInstalledId] invoke failed: ${formatUnknownError(e)}`);
    } catch {}
  }
}

export async function removeInstalledId(id: string): Promise<void> {
  try {
    await ipc.removeInstalledIdCmd({ id });
  } catch (e: unknown) {
    try {
      await logError(`[removeInstalledId] invoke failed: ${formatUnknownError(e)}`);
    } catch {}
  }
}

export async function saveInstalledSnapshot(detectedMap: Record<string, string>): Promise<Record<string, string>> {
  const snapshot: Record<string, string> = {};
  for (const [id, ver] of Object.entries(detectedMap)) {
    if (ver) snapshot[id] = String(ver);
  }
  return await writeInstalledMap(snapshot);
}

export async function detectInstalledVersionsMap(items: InstallerRunnableItem[]): Promise<Record<string, string>> {
  const list = Array.isArray(items) ? items : [];
  const res = await ipc.detectVersionsMap({ items: list });
  const parsed = stringMapSchema.safeParse(res);
  if (parsed.success) {
    return parsed.data;
  }
  try {
    await logError('[detectInstalledVersionsMap] invalid response shape from detect_versions_map');
  } catch {}
  return {};
}
