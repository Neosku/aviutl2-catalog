import { loadInstallCatalog } from './catalogClient';
import type { PackageItem } from './catalogStore';
import { hasInstaller } from './installer/shape';
import type { Installer, InstallerRunnableItem } from './installer/types';

export type InstallableCatalogItem = PackageItem & InstallerRunnableItem & { installer: Installer };

export async function resolveInstallableCatalogItem(
  item: PackageItem | InstallerRunnableItem | null | undefined,
): Promise<InstallableCatalogItem | null> {
  if (!item || typeof item !== 'object') {
    return null;
  }

  if (hasInstaller(item)) {
    return item as InstallableCatalogItem;
  }

  const id = item.id.trim();
  if (!id) {
    return null;
  }

  const installResult = await loadInstallCatalog();
  const installPackage = installResult.install.packages[id];
  if (!installPackage) {
    return null;
  }

  return {
    ...(item as PackageItem & InstallerRunnableItem),
    installer: installPackage.installation,
    latestVersion: item.latestVersion ?? '',
  };
}
