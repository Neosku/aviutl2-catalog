import { ipc } from './invokeIpc';
import { getSettings } from './settings';
import { normalizeStringIdList } from './normalizeStringIdList';

let cachedPausedPackageUpdateIds: string[] | null = null;

export async function loadPausedPackageUpdateIds(force = false): Promise<string[]> {
  if (!force && cachedPausedPackageUpdateIds) {
    return cachedPausedPackageUpdateIds;
  }
  const settings = await getSettings();
  const ids = normalizeStringIdList(settings.package_updates_paused_ids);
  cachedPausedPackageUpdateIds = ids;
  return ids;
}

export function getCachedPausedPackageUpdateIds(): string[] | null {
  return cachedPausedPackageUpdateIds ? [...cachedPausedPackageUpdateIds] : null;
}

export async function persistPausedPackageUpdate(packageId: string, paused: boolean): Promise<string[]> {
  const ids = normalizeStringIdList(
    await ipc.setPackageUpdatePaused({
      packageId,
      paused,
    }),
  );
  cachedPausedPackageUpdateIds = ids;
  return ids;
}
