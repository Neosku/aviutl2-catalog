import { useCallback, useMemo, useState } from 'react';
import type { CatalogDispatch, PackageInstallProgress, PackageItem } from '../../model/types';
import type { UsePackageInstallActionsResult } from '../types';
import { errorMessage } from '../../model/helpers';
import {
  detectInstalledVersionsMap,
  hasInstaller,
  loadInstalledMap,
  removeInstalledId,
  runInstallerForItem,
  runUninstallerForItem,
} from '../../../../utils/index.js';

interface UsePackageInstallActionsParams {
  item: PackageItem | undefined;
  dispatch: CatalogDispatch;
}

function createInitialProgress(): PackageInstallProgress {
  return { ratio: 0, percent: 0, label: '準備中…', phase: 'init' };
}

export default function usePackageInstallActions({
  item,
  dispatch,
}: UsePackageInstallActionsParams): UsePackageInstallActionsResult {
  const [error, setError] = useState('');
  const [downloading, setDownloading] = useState(false);
  const [updating, setUpdating] = useState(false);
  const [removing, setRemoving] = useState(false);
  const [downloadProgress, setDownloadProgress] = useState<PackageInstallProgress | null>(null);
  const [updateProgress, setUpdateProgress] = useState<PackageInstallProgress | null>(null);

  const runInstall = useCallback(
    async (mode: 'download' | 'update') => {
      if (!item) return;
      const isUpdate = mode === 'update';
      const setBusy = isUpdate ? setUpdating : setDownloading;
      const setProgress = isUpdate ? setUpdateProgress : setDownloadProgress;
      const errorPrefix = isUpdate ? '更新に失敗しました' : 'インストールに失敗しました';
      try {
        setBusy(true);
        setProgress(createInitialProgress());
        if (!hasInstaller(item)) {
          throw new Error('インストールが未実装です');
        }
        await runInstallerForItem(item, dispatch, setProgress);
      } catch (installError) {
        setError(`${errorPrefix}\n\n${errorMessage(installError)}`);
      } finally {
        setBusy(false);
        setProgress(null);
      }
    },
    [dispatch, item],
  );

  const onDownload = useCallback(async () => {
    await runInstall('download');
  }, [runInstall]);

  const onUpdate = useCallback(async () => {
    await runInstall('update');
  }, [runInstall]);

  const onRemove = useCallback(async () => {
    if (!item) return;
    try {
      setRemoving(true);
      const uninstallSteps =
        item.installer && typeof item.installer === 'object' && Array.isArray(item.installer.uninstall)
          ? item.installer.uninstall
          : [];
      const hasUninstall = uninstallSteps.length > 0;
      if (hasInstaller(item) && hasUninstall) {
        await runUninstallerForItem(item, dispatch);
      } else {
        await removeInstalledId(item.id);
        const installedMap = await loadInstalledMap();
        dispatch({ type: 'SET_INSTALLED_MAP', payload: installedMap });

        const detectedMap = await detectInstalledVersionsMap([item]);
        const detected = String((detectedMap && detectedMap[item.id]) || '');
        dispatch({ type: 'SET_DETECTED_ONE', payload: { id: item.id, version: detected } });
      }
    } catch (removeError) {
      setError(`削除に失敗しました\n\n${errorMessage(removeError)}`);
    } finally {
      setRemoving(false);
      setDownloadProgress(null);
      setUpdateProgress(null);
    }
  }, [dispatch, item]);

  const downloadProgressView = useMemo(
    () => ({
      ratio: downloadProgress?.ratio ?? 0,
      percent: downloadProgress?.percent ?? Math.round((downloadProgress?.ratio ?? 0) * 100),
      label: downloadProgress?.label ?? '準備中…',
    }),
    [downloadProgress],
  );

  const updateProgressView = useMemo(
    () => ({
      ratio: updateProgress?.ratio ?? 0,
      percent: updateProgress?.percent ?? Math.round((updateProgress?.ratio ?? 0) * 100),
      label: updateProgress?.label ?? '準備中…',
    }),
    [updateProgress],
  );

  return {
    error,
    setError,
    downloading,
    updating,
    removing,
    downloadProgressView,
    updateProgressView,
    onDownload,
    onUpdate,
    onRemove,
  };
}
