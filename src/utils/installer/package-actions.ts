import { detectInstalledVersionsMap, loadInstalledMap, removeInstalledId } from '../installed-map';
import type { CatalogAction } from '../catalogStore';
import { runInstallerForItem } from './install';
import { hasInstaller } from './shape';
import type { InstallProgressPayload, InstallerRunnableItem } from './types';
import { runUninstallerForItem } from './uninstall';

type CatalogDispatch = ((action: CatalogAction) => void) | null | undefined;

function hasUninstallScript(item: InstallerRunnableItem): boolean {
  const installer =
    typeof item.installer === 'object' && item.installer ? (item.installer as { uninstall?: unknown }) : null;
  return Array.isArray(installer?.uninstall) && installer.uninstall.length > 0;
}

async function syncRemovedPackageState(item: InstallerRunnableItem, dispatch: CatalogDispatch): Promise<void> {
  await removeInstalledId(item.id);

  if (dispatch) {
    const installedMap = await loadInstalledMap();
    dispatch({ type: 'SET_INSTALLED_MAP', payload: installedMap });

    const detectedMap = await detectInstalledVersionsMap([item]);
    const detectedVersion = String(detectedMap?.[item.id] || '');
    dispatch({ type: 'SET_DETECTED_ONE', payload: { id: item.id, version: detectedVersion } });
  }
}

export async function runPackageInstallAction(
  item: InstallerRunnableItem,
  dispatch: CatalogDispatch,
  onProgress?: (progress: InstallProgressPayload) => void,
  missingInstallerMessage: string = 'インストーラーがありません',
): Promise<void> {
  if (!hasInstaller(item)) throw new Error(missingInstallerMessage);
  await runInstallerForItem(item, dispatch, onProgress);
}

export async function runPackageRemoveAction(item: InstallerRunnableItem, dispatch: CatalogDispatch): Promise<void> {
  if (hasInstaller(item) && hasUninstallScript(item)) {
    await runUninstallerForItem(item, dispatch);
    return;
  }

  await syncRemovedPackageState(item, dispatch);
}
