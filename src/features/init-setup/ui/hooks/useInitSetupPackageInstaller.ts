import { useCallback } from 'react';
import { hasInstaller, runInstallerForItem } from '../../../../utils/index.js';
import { getErrorMessage } from '../../model/helpers';
import type { CatalogItem, InstallProgress, PackageItemsMap, PackageState } from '../../model/types';

interface UseInitSetupPackageInstallerParams {
  packageItems: PackageItemsMap;
  ensurePackageItem: (id: string) => Promise<CatalogItem | null>;
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
  const downloadRequiredPackage = useCallback(
    async (id: string) => {
      if (!id) return false;

      let pkg = packageItems[id];
      if (!pkg) {
        try {
          pkg = await ensurePackageItem(id);
        } catch (fetchError) {
          const detail = getErrorMessage(fetchError) || 'パッケージ情報を取得できませんでした。';
          updatePackageState(id, () => ({ downloading: false, error: detail, progress: null }));
          return false;
        }
      }
      if (!pkg || !hasInstaller(pkg)) {
        updatePackageState(id, () => ({
          downloading: false,
          error: 'インストールできないパッケージです。',
          progress: null,
        }));
        return false;
      }

      const initialProgress: InstallProgress = {
        ratio: 0,
        percent: 0,
        label: '準備中…',
        phase: 'init',
        step: null,
        stepIndex: null,
        totalSteps: null,
      };
      updatePackageState(id, () => ({ downloading: true, installed: false, error: '', progress: initialProgress }));

      const handleProgress = (payload: unknown) => {
        if (!payload || typeof payload !== 'object') return;
        const progress = payload as InstallProgress;
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
        const detail = getErrorMessage(installError) || 'エラーが発生しました。';
        updatePackageState(id, () => ({ downloading: false, error: detail, progress: null }));
        return false;
      }
    },
    [ensurePackageItem, markVersionsDirty, packageItems, updatePackageState],
  );

  return {
    downloadRequiredPackage,
  };
}
