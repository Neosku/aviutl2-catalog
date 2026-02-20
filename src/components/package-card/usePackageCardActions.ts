import { useState } from 'react';
import {
  detectInstalledVersionsMap,
  loadInstalledMap,
  hasInstaller,
  removeInstalledId,
  runInstallerForItem,
  runUninstallerForItem,
} from '../../utils/index.js';
import { useCatalogDispatch } from '../../utils/catalogStore.jsx';
import type { CatalogDispatch, PackageInstallProgress, PackageItem } from '../../features/package/model/types';
import type { UsePackageCardActionsResult } from './types';

function toErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  return String(error || '不明なエラー');
}

function hasUninstallScript(item: PackageItem): boolean {
  const installer = typeof item.installer === 'object' && item.installer ? item.installer : null;
  return Array.isArray(installer?.uninstall) && installer.uninstall.length > 0;
}

async function syncRemovedPackageState(item: PackageItem, dispatch: CatalogDispatch): Promise<void> {
  await removeInstalledId(item.id);
  const installedMap = await loadInstalledMap();
  dispatch({ type: 'SET_INSTALLED_MAP', payload: installedMap });

  const detectedMap = await detectInstalledVersionsMap([item]);
  const detectedVersion = String(detectedMap?.[item.id] || '');
  dispatch({ type: 'SET_DETECTED_ONE', payload: { id: item.id, version: detectedVersion } });
}

export default function usePackageCardActions(item: PackageItem): UsePackageCardActionsResult {
  const dispatch = useCatalogDispatch() as CatalogDispatch;

  const [error, setError] = useState('');
  const [downloading, setDownloading] = useState(false);
  const [updating, setUpdating] = useState(false);
  const [removing, setRemoving] = useState(false);
  const [downloadProgress, setDownloadProgress] = useState<PackageInstallProgress | null>(null);
  const [updateProgress, setUpdateProgress] = useState<PackageInstallProgress | null>(null);

  const runInstallAction = async (
    setBusy: (value: boolean) => void,
    setProgress: (value: PackageInstallProgress | null) => void,
    actionLabel: string,
  ): Promise<void> => {
    try {
      setBusy(true);
      setProgress({ ratio: 0, percent: 0, label: '準備中…', phase: 'init' });
      if (!hasInstaller(item)) throw new Error('インストーラーがありません');
      await runInstallerForItem(item, dispatch, setProgress);
    } catch (installError) {
      setError(`${actionLabel}に失敗しました\n\n${toErrorMessage(installError)}`);
    } finally {
      setBusy(false);
      setProgress(null);
    }
  };

  const onDownload = async (): Promise<void> => {
    await runInstallAction(setDownloading, setDownloadProgress, 'インストール');
  };

  const onUpdate = async (): Promise<void> => {
    await runInstallAction(setUpdating, setUpdateProgress, '更新');
  };

  const onRemove = async (): Promise<void> => {
    try {
      setRemoving(true);

      if (hasInstaller(item) && hasUninstallScript(item)) {
        await runUninstallerForItem(item, dispatch);
      } else {
        await syncRemovedPackageState(item, dispatch);
      }
    } catch (removeError) {
      setError(`削除に失敗しました\n\n${toErrorMessage(removeError)}`);
    } finally {
      setRemoving(false);
      setDownloadProgress(null);
      setUpdateProgress(null);
    }
  };

  return {
    error,
    setError,
    downloading,
    updating,
    removing,
    downloadRatio: downloadProgress?.ratio ?? 0,
    updateRatio: updateProgress?.ratio ?? 0,
    onDownload,
    onUpdate,
    onRemove,
  };
}
