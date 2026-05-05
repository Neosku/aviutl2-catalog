import { computeStableTextHash } from './helpers';
import { normalizeInstallStepState, normalizeUninstallStepState } from './installerRules';
import type { RegisterCatalogItem, RegisterPackageForm } from './types';

export type RegisterDraftTestState = 'not_required' | 'ready' | 'blocked';

function normalizeInstaller(installer: RegisterPackageForm['installer']) {
  return {
    sourceType: installer.sourceType,
    directUrl: installer.directUrl.trim(),
    boothUrl: installer.boothUrl.trim(),
    githubOwner: installer.githubOwner.trim(),
    githubRepo: installer.githubRepo.trim(),
    githubPattern: installer.githubPattern.trim(),
    googleDriveId: installer.googleDriveId.trim(),
    installSteps: installer.installSteps.map((step) => {
      const normalized = normalizeInstallStepState(step);
      return {
        action: normalized.action,
        path: normalized.path.trim(),
        argsText: normalized.argsText.trim(),
        from: normalized.from.trim(),
        to: normalized.to.trim(),
        elevate: normalized.elevate === true,
      };
    }),
    uninstallSteps: installer.uninstallSteps.map((step) => {
      const normalized = normalizeUninstallStepState(step);
      return {
        action: normalized.action,
        path: normalized.path.trim(),
        argsText: normalized.argsText.trim(),
        elevate: normalized.elevate === true,
      };
    }),
  };
}

function normalizeVersions(versions: RegisterPackageForm['versions']) {
  return versions.map((version) => ({
    version: version.version.trim(),
    releaseDate: version.releaseDate.trim(),
    files: version.files.map((file) => ({
      path: file.path.trim(),
      xxh128: file.xxh128.trim(),
    })),
  }));
}

export function computeRegisterRelevantHash(form: Pick<RegisterPackageForm, 'id' | 'installer' | 'versions'>): string {
  const normalized = {
    id: form.id.trim(),
    installer: normalizeInstaller(form.installer),
    versions: normalizeVersions(form.versions),
  };
  return computeStableTextHash(JSON.stringify(normalized));
}

export function getRegisterRelevantHashFromCatalogItem(item: RegisterCatalogItem | null | undefined): string {
  return String(item?.registerRelevantHash || '');
}

export function findRegisterCatalogItem(
  catalogItems: RegisterCatalogItem[],
  packageId: string,
): RegisterCatalogItem | null {
  const normalizedPackageId = packageId.trim();
  if (!normalizedPackageId) return null;
  return catalogItems.find((item) => item.id === normalizedPackageId) || null;
}

export function resolveRegisterCatalogRelevantHash(catalogItems: RegisterCatalogItem[], packageId: string): string {
  return getRegisterRelevantHashFromCatalogItem(findRegisterCatalogItem(catalogItems, packageId));
}

export function isRegisterTestRequired(args: {
  catalogItems: RegisterCatalogItem[];
  packageId: string;
  packageForm: Pick<RegisterPackageForm, 'id' | 'installer' | 'versions'>;
}): boolean {
  const baselineRelevantHash = resolveRegisterCatalogRelevantHash(args.catalogItems, args.packageId);
  if (!baselineRelevantHash) return true;
  return baselineRelevantHash !== computeRegisterRelevantHash(args.packageForm);
}

export function resolveRegisterDraftTestState(args: {
  catalogItems: RegisterCatalogItem[];
  packageId: string;
  installerTestedHash?: string;
  uninstallerTestedHash?: string;
  packageForm: Pick<RegisterPackageForm, 'id' | 'installer' | 'versions'>;
}): {
  installerReady: boolean;
  uninstallerReady: boolean;
  state: RegisterDraftTestState;
} {
  const currentRelevantHash = computeRegisterRelevantHash(args.packageForm);
  const baselineRelevantHash = resolveRegisterCatalogRelevantHash(args.catalogItems, args.packageId);
  const requiresTest = !baselineRelevantHash || baselineRelevantHash !== currentRelevantHash;
  if (!requiresTest) {
    return {
      installerReady: true,
      uninstallerReady: true,
      state: 'not_required',
    };
  }
  const installerReady = (args.installerTestedHash ?? '') === currentRelevantHash;
  const uninstallerReady = (args.uninstallerTestedHash ?? '') === currentRelevantHash;
  return {
    installerReady,
    uninstallerReady,
    state: installerReady && uninstallerReady ? 'ready' : 'blocked',
  };
}
