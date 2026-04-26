import { useTranslation } from 'react-i18next';
import type { CatalogDispatch, PackageItem } from '@/utils/catalogStore';
import type { UsePackageInstallActionsResult } from '../types';
import usePackageInstallerActions from '@/utils/usePackageInstallerActions';

interface UsePackageInstallActionsParams {
  item: PackageItem | undefined;
  dispatch: CatalogDispatch;
}

export default function usePackageInstallActions({
  item,
  dispatch,
}: UsePackageInstallActionsParams): UsePackageInstallActionsResult {
  const { t } = useTranslation(['package', 'common']);
  const idleLabel = t('common:status.preparing');
  const {
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
  } = usePackageInstallerActions({
    item,
    dispatch,
    missingInstallerMessage: t('actions.missingInstaller'),
  });
  const progressView =
    busyAction === 'download' || busyAction === 'update'
      ? {
          ratio: progress.ratio ?? 0,
          percent: progress.percent ?? Math.round((progress.ratio ?? 0) * 100),
          label: progress.label ?? idleLabel,
        }
      : { ratio: 0, percent: 0, label: idleLabel };

  return {
    error,
    setError,
    busyAction,
    isBusy,
    progressView,
    noticeModal,
    closeNoticeModal,
    confirmNoticeModal,
    onDownload,
    onUpdate,
    onRemove,
  };
}
