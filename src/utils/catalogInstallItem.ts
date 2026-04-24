import type { CatalogInstallPackage } from '@/utils/catalog-schema/distribution/installSchema';
import { loadInstallCatalog } from './catalogClient';
import type { PackageItem } from './catalogStore';
import type { Installer, InstallerAction, InstallerSource } from './catalogSchema';
import type { InstallerRunnableItem } from './installer/types';

export type InstallableCatalogItem = PackageItem & InstallerRunnableItem & { installer: Installer };

export async function resolveInstallableCatalogItem(
  item: PackageItem | InstallerRunnableItem | null | undefined,
): Promise<InstallableCatalogItem | null> {
  if (!item || typeof item !== 'object') {
    return null;
  }

  if (hasResolvedInstaller(item)) {
    return item as InstallableCatalogItem;
  }

  const id = typeof item.id === 'string' ? item.id.trim() : '';
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
    installer: toLegacyInstaller(installPackage),
    'latest-version': readLatestVersion(item),
  };
}

function hasResolvedInstaller(item: PackageItem | InstallerRunnableItem): item is InstallableCatalogItem {
  return Boolean(item.installer && typeof item.installer === 'object' && Array.isArray(item.installer.install));
}

function readLatestVersion(item: PackageItem | InstallerRunnableItem): string {
  if (typeof item['latest-version'] === 'string' && item['latest-version']) {
    return item['latest-version'];
  }
  if ('latestVersion' in item && typeof item.latestVersion === 'string') {
    return item.latestVersion;
  }
  return '';
}

function toLegacyInstaller(pkg: CatalogInstallPackage): Installer {
  return {
    source: toLegacyInstallerSource(pkg.installation.source),
    install: pkg.installation.installSteps.map(toLegacyInstallerAction),
    uninstall: pkg.installation.uninstallSteps.map(toLegacyInstallerAction),
  };
}

function toLegacyInstallerSource(source: CatalogInstallPackage['installation']['source']): InstallerSource {
  switch (source.type) {
    case 'directUrl':
      return { direct: source.url };
    case 'booth':
      return { booth: source.url };
    case 'githubRelease':
      return {
        github: {
          owner: source.owner,
          repo: source.repo,
          pattern: source.pattern,
        },
      };
    case 'googleDrive':
      return { GoogleDrive: { id: source.id } };
  }
}

function toLegacyInstallerAction(
  step:
    | CatalogInstallPackage['installation']['installSteps'][number]
    | CatalogInstallPackage['installation']['uninstallSteps'][number],
): InstallerAction {
  switch (step.action) {
    case 'download':
      return { action: 'download' };
    case 'extract':
      return {
        action: 'extract',
        from: step.from,
        to: step.to,
      };
    case 'extractSfx':
      return {
        action: 'extract_sfx',
        from: step.from,
        to: step.to,
      };
    case 'copy':
      return {
        action: 'copy',
        from: step.from,
        to: step.to,
      };
    case 'delete':
      return {
        action: 'delete',
        path: step.path,
      };
    case 'run':
      return {
        action: 'run',
        path: step.path,
        args: step.args ?? [],
        elevate: step.elevate,
      };
    case 'runAuoSetup':
      return {
        action: 'run_auo_setup',
        path: step.path,
      };
  }
}
