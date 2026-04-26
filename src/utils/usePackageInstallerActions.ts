import { i18n } from '@/i18n';
import { useCallback, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { resolveInstallableCatalogItem } from './catalogInstallItem';
import type { CatalogDispatch } from './catalogStore';
import { loadPackageNoticeContent } from './packageNotice';
import { runPackageInstallAction, runPackageRemoveAction } from './installer';
import type { InstallProgressPayload, InstallerRunnableItem } from './installer/types';
import useExclusiveBusyAction from './useExclusiveBusyAction';

export type PackageInstallBusyAction = 'idle' | 'download' | 'update' | 'remove';

export interface UsePackageInstallerActionsParams {
  item: InstallerRunnableItem | undefined;
  dispatch: CatalogDispatch | null | undefined;
  missingInstallerMessage?: string;
}

export interface UsePackageInstallerActionsResult {
  error: string;
  setError: (value: string) => void;
  busyAction: PackageInstallBusyAction;
  isBusy: boolean;
  progress: InstallProgressPayload;
  noticeModal: {
    open: boolean;
    title: string;
    html: string;
  };
  closeNoticeModal: () => void;
  confirmNoticeModal: () => Promise<void>;
  onDownload: () => Promise<void>;
  onUpdate: () => Promise<void>;
  onRemove: () => Promise<void>;
}

function toErrorMessage(error: unknown): string {
  if (error instanceof Error && error.message) return error.message;
  return String(error || i18n.t('common:errors.unknown'));
}

export function createInitialInstallProgress(label: string): InstallProgressPayload {
  return {
    ratio: 0,
    percent: 0,
    step: null,
    stepIndex: null,
    totalSteps: 0,
    label,
    phase: 'init',
  };
}

export default function usePackageInstallerActions({
  item,
  dispatch,
  missingInstallerMessage,
}: UsePackageInstallerActionsParams): UsePackageInstallerActionsResult {
  const { t } = useTranslation(['common', 'package']);
  const resolvedMissingInstallerMessage = missingInstallerMessage || t('package:actions.missingInstaller');
  const [error, setError] = useState('');
  const [progress, setProgress] = useState<InstallProgressPayload>(() =>
    createInitialInstallProgress(t('common:status.preparing')),
  );
  const [noticeModal, setNoticeModal] = useState(() => ({
    open: false,
    title: '',
    html: '',
  }));
  const [pendingDownload, setPendingDownload] = useState<null | (() => Promise<void>)>(null);
  const { busyAction, beginAction, finishAction, isBusy } = useExclusiveBusyAction<PackageInstallBusyAction, 'idle'>(
    'idle',
  );

  const resetProgress = useCallback(() => {
    setProgress(createInitialInstallProgress(t('common:status.preparing')));
  }, [t]);

  const runInstall = useCallback(
    async (action: Extract<PackageInstallBusyAction, 'download' | 'update'>, actionLabel: string) => {
      if (!item) return;
      if (!beginAction(action)) return;

      try {
        resetProgress();
        const resolvedItem = await resolveInstallableCatalogItem(item);
        if (!resolvedItem) {
          throw new Error(resolvedMissingInstallerMessage);
        }
        await runPackageInstallAction(
          resolvedItem,
          dispatch,
          (nextProgress) => {
            setProgress(nextProgress ?? createInitialInstallProgress(t('common:status.preparing')));
          },
          resolvedMissingInstallerMessage,
        );
      } catch (installError) {
        setError(t('package:errors.actionFailed', { action: actionLabel, detail: toErrorMessage(installError) }));
      } finally {
        finishAction();
        resetProgress();
      }
    },
    [beginAction, dispatch, finishAction, item, resolvedMissingInstallerMessage, resetProgress, t],
  );

  const closeNoticeModal = useCallback(() => {
    setNoticeModal({ open: false, title: '', html: '' });
    setPendingDownload(null);
  }, []);

  const confirmNoticeModal = useCallback(async () => {
    const nextDownload = pendingDownload;
    closeNoticeModal();
    if (nextDownload) {
      await nextDownload();
    }
  }, [closeNoticeModal, pendingDownload]);

  const onDownload = useCallback(async () => {
    if (!item) return;
    try {
      const notice = await loadPackageNoticeContent(item.id);
      if (notice?.html) {
        setPendingDownload(() => async () => {
          await runInstall('download', t('package:actions.install'));
        });
        const itemName =
          'name' in item && typeof item.name === 'string' && item.name.trim() ? item.name.trim() : item.id;
        setNoticeModal({
          open: true,
          title: itemName,
          html: notice.html,
        });
        return;
      }
    } catch (noticeError) {
      setError(
        t('package:errors.actionFailed', { action: t('package:actions.install'), detail: toErrorMessage(noticeError) }),
      );
      return;
    }
    await runInstall('download', t('package:actions.install'));
  }, [item, runInstall, t]);

  const onUpdate = useCallback(async () => {
    await runInstall('update', t('package:actions.update'));
  }, [runInstall, t]);

  const onRemove = useCallback(async () => {
    if (!item) return;
    if (!beginAction('remove')) return;

    try {
      const resolvedItem = (await resolveInstallableCatalogItem(item)) ?? item;
      await runPackageRemoveAction(resolvedItem, dispatch);
    } catch (removeError) {
      setError(
        t('package:errors.actionFailed', { action: t('package:actions.remove'), detail: toErrorMessage(removeError) }),
      );
    } finally {
      finishAction();
      resetProgress();
    }
  }, [beginAction, dispatch, finishAction, item, resetProgress, t]);

  return {
    error,
    setError,
    busyAction,
    isBusy,
    progress,
    noticeModal,
    closeNoticeModal,
    confirmNoticeModal,
    onDownload,
    onUpdate,
    onRemove,
  };
}
