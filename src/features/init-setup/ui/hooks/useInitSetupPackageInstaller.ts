import { useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { hasInstaller, runInstallerForItem } from '@/utils/installer';
import type { InstallableCatalogItem } from '@/utils/catalogInstallItem';
import type { InstallProgressPayload } from '@/utils/installer/types';
import { getErrorMessage } from '../../model/helpers';
import type { PackageItemsMap, PackageState } from '../../model/types';

interface UseInitSetupPackageInstallerParams {
  packageItems: PackageItemsMap;
  ensurePackageItem: (id: string) => Promise<InstallableCatalogItem | null>;
  updatePackageState: (
    id: string,
    updater: Partial<PackageState> | ((current: PackageState) => Partial<PackageState>),
  ) => void;
  markVersionsDirty: () => void;
}

export default function useInitSetupPackageInstaller({
  packageItems,
  ensurePackageItem,
  updatePackageState,
  markVersionsDirty,
}: UseInitSetupPackageInstallerParams) {
  const { t } = useTranslation(['common', 'initSetup']);
  const downloadRequiredPackage = useCallback(
    async (id: string) => {
      if (!id) return false;

      let pkg = packageItems[id];
      if (!pkg) {
        try {
          pkg = await ensurePackageItem(id);
        } catch (fetchError) {
          const detail = getErrorMessage(fetchError) || t('initSetup:errors.packageInfoUnavailable');
          updatePackageState(id, () => ({ downloading: false, error: detail, progress: null }));
          return false;
        }
      }
      if (!pkg || !hasInstaller(pkg)) {
        updatePackageState(id, () => ({
          downloading: false,
          error: t('initSetup:errors.packageNotInstallable'),
          progress: null,
        }));
        return false;
      }

      const initialProgress: InstallProgressPayload = {
        ratio: 0,
        percent: 0,
        label: t('common:status.preparing'),
        phase: 'init',
        step: null,
        stepIndex: null,
        totalSteps: 0,
      };
      updatePackageState(id, () => ({ downloading: true, installed: false, error: '', progress: initialProgress }));

      const handleProgress = (progress: InstallProgressPayload) => {
        updatePackageState(id, () => ({
          progress,
          downloading: progress.phase !== 'done' && progress.phase !== 'error',
        }));
      };

      try {
        await runInstallerForItem(pkg, null, handleProgress);
        updatePackageState(id, { downloading: false, installed: true, error: '', progress: null });
        markVersionsDirty();
        return true;
      } catch (installError) {
        const detail = getErrorMessage(installError) || t('initSetup:errors.generic');
        updatePackageState(id, () => ({ downloading: false, error: detail, progress: null }));
        return false;
      }
    },
    [ensurePackageItem, markVersionsDirty, packageItems, t, updatePackageState],
  );

  return {
    downloadRequiredPackage,
  };
}
