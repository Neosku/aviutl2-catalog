import { i18n } from '@/i18n';
import { MISSING_DETECT_RESULT } from '../detectResult';
import { detectInstalledVersionsMap, loadInstalledMap, removeInstalledId } from '../installed-map';
import type { CatalogDispatch } from '../catalogStore';
import { runInstallerForItem } from './install';
import { hasInstaller } from './shape';
import type { Installer, InstallProgressPayload, InstallerRunnableItem } from './types';
import { runUninstallerForItem } from './uninstall';

function hasUninstallScript(item: InstallerRunnableItem & { installer: Installer }): boolean {
  return item.installer.uninstallSteps.length > 0;
}

async function syncRemovedPackageState(
  item: InstallerRunnableItem,
  dispatch: CatalogDispatch | null | undefined,
): Promise<void> {
  await removeInstalledId(item.id);

  if (dispatch) {
    const installedMap = await loadInstalledMap();
    dispatch({ type: 'SET_INSTALLED_MAP', payload: installedMap });

    const detectedMap = await detectInstalledVersionsMap([item]);
    dispatch({
      type: 'SET_DETECTED_ONE',
      payload: { id: item.id, result: detectedMap[item.id] ?? MISSING_DETECT_RESULT },
    });
  }
}

export async function runPackageInstallAction(
  item: InstallerRunnableItem,
  dispatch: CatalogDispatch | null | undefined,
  onProgress?: (progress: InstallProgressPayload) => void,
  missingInstallerMessage: string = i18n.t('package:actions.missingInstaller'),
): Promise<void> {
  if (!hasInstaller(item)) throw new Error(missingInstallerMessage);
  await runInstallerForItem(item, dispatch, onProgress);
}

export async function runPackageRemoveAction(
  item: InstallerRunnableItem,
  dispatch: CatalogDispatch | null | undefined,
): Promise<void> {
  if (hasInstaller(item) && hasUninstallScript(item)) {
    await runUninstallerForItem(item, dispatch);
    return;
  }

  await syncRemovedPackageState(item, dispatch);
}
