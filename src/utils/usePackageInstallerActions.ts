import { useCallback, useState } from 'react';
import type { CatalogAction } from './catalogStore';
import { runPackageInstallAction, runPackageRemoveAction } from './installer';
import type { InstallProgressPayload, InstallerRunnableItem } from './installer/types';
import useExclusiveBusyAction from './useExclusiveBusyAction';

export type PackageInstallBusyAction = 'idle' | 'download' | 'update' | 'remove';

type CatalogDispatch = ((action: CatalogAction) => void) | null | undefined;

export interface UsePackageInstallerActionsParams {
  item: InstallerRunnableItem | undefined;
  dispatch: CatalogDispatch;
  missingInstallerMessage?: string;
}

export interface UsePackageInstallerActionsResult {
  error: string;
  setError: (value: string) => void;
  busyAction: PackageInstallBusyAction;
  isBusy: boolean;
  progress: InstallProgressPayload;
  onDownload: () => Promise<void>;
  onUpdate: () => Promise<void>;
  onRemove: () => Promise<void>;
}

function toErrorMessage(error: unknown): string {
  if (error instanceof Error && error.message) return error.message;
  return String(error || '不明なエラー');
}

export function createInitialInstallProgress(): InstallProgressPayload {
  return {
    ratio: 0,
    percent: 0,
    step: null,
    stepIndex: null,
    totalSteps: 0,
    label: '準備中…',
    phase: 'init',
  };
}

export default function usePackageInstallerActions({
  item,
  dispatch,
  missingInstallerMessage = 'インストーラーがありません',
}: UsePackageInstallerActionsParams): UsePackageInstallerActionsResult {
  const [error, setError] = useState('');
  const [progress, setProgress] = useState<InstallProgressPayload>(createInitialInstallProgress);
  const { busyAction, beginAction, finishAction, isBusy } = useExclusiveBusyAction<PackageInstallBusyAction, 'idle'>(
    'idle',
  );

  const resetProgress = useCallback(() => {
    setProgress(createInitialInstallProgress());
  }, []);

  const runInstall = useCallback(
    async (action: Extract<PackageInstallBusyAction, 'download' | 'update'>, actionLabel: string) => {
      if (!item) return;
      if (!beginAction(action)) return;

      try {
        resetProgress();
        await runPackageInstallAction(
          item,
          dispatch,
          (nextProgress) => {
            setProgress(nextProgress ?? createInitialInstallProgress());
          },
          missingInstallerMessage,
        );
      } catch (installError) {
        setError(`${actionLabel}に失敗しました\n\n${toErrorMessage(installError)}`);
      } finally {
        finishAction();
        resetProgress();
      }
    },
    [beginAction, dispatch, finishAction, item, missingInstallerMessage, resetProgress],
  );

  const onDownload = useCallback(async () => {
    await runInstall('download', 'インストール');
  }, [runInstall]);

  const onUpdate = useCallback(async () => {
    await runInstall('update', '更新');
  }, [runInstall]);

  const onRemove = useCallback(async () => {
    if (!item) return;
    if (!beginAction('remove')) return;

    try {
      await runPackageRemoveAction(item, dispatch);
    } catch (removeError) {
      setError(`削除に失敗しました\n\n${toErrorMessage(removeError)}`);
    } finally {
      finishAction();
      resetProgress();
    }
  }, [beginAction, dispatch, finishAction, item, resetProgress]);

  return {
    error,
    setError,
    busyAction,
    isBusy,
    progress,
    onDownload,
    onUpdate,
    onRemove,
  };
}
