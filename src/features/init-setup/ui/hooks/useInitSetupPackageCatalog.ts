import type { InitSetupStep } from '../../model/types';
import useInitSetupCatalogStore from './useInitSetupCatalogStore';
import useInitSetupPackageInstaller from './useInitSetupPackageInstaller';
import useInitSetupVersionDetection from './useInitSetupVersionDetection';

interface UseInitSetupPackageCatalogParams {
  step: InitSetupStep;
  requiredPluginIds: string[];
  corePackageId: string;
}

export default function useInitSetupPackageCatalog({
  step,
  requiredPluginIds,
  corePackageId,
}: UseInitSetupPackageCatalogParams) {
  const store = useInitSetupCatalogStore({ requiredPluginIds, corePackageId });
  const detection = useInitSetupVersionDetection({
    step,
    requiredPluginIds,
    packageItems: store.packageItems,
    onDetected: store.applyDetectedVersions,
  });
  const installer = useInitSetupPackageInstaller({
    packageItems: store.packageItems,
    ensurePackageItem: store.ensurePackageItem,
    updatePackageState: store.updatePackageState,
    markVersionsDirty: detection.markVersionsDirty,
  });

  return {
    requiredPackages: store.requiredPackages,
    packageVersions: detection.packageVersions,
    allRequiredInstalled: store.allRequiredInstalled,
    packagesLoading: store.packagesLoading,
    packagesError: store.packagesError,
    coreProgressRatio: store.coreProgressRatio,
    downloadRequiredPackage: installer.downloadRequiredPackage,
  };
}
