import { useMemo } from 'react';
import type { CatalogDispatch, PackageItem } from '../../model/types';
import type { UsePackageInstallActionsResult } from '../types';
import usePackageInstallerActions from '../../../../utils/usePackageInstallerActions';

interface UsePackageInstallActionsParams {
  item: PackageItem | undefined;
  dispatch: CatalogDispatch;
}

const IDLE_PROGRESS_VIEW = { ratio: 0, percent: 0, label: '準備中…' };

export default function usePackageInstallActions({
  item,
  dispatch,
}: UsePackageInstallActionsParams): UsePackageInstallActionsResult {
  const { error, setError, busyAction, isBusy, progress, onDownload, onUpdate, onRemove } = usePackageInstallerActions({
    item,
    dispatch,
    missingInstallerMessage: 'インストールが未実装です',
  });

  const activeProgressView = useMemo(
    () => ({
      ratio: progress.ratio ?? 0,
      percent: progress.percent ?? Math.round((progress.ratio ?? 0) * 100),
      label: progress.label ?? '準備中…',
    }),
    [progress.label, progress.percent, progress.ratio],
  );

  return {
    error,
    setError,
    busyAction,
    isBusy,
    progressView: busyAction === 'download' || busyAction === 'update' ? activeProgressView : IDLE_PROGRESS_VIEW,
    onDownload,
    onUpdate,
    onRemove,
  };
}
