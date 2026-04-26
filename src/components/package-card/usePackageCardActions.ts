import { useTranslation } from 'react-i18next';
import { useCatalogDispatch } from '@/utils/catalogStore';
import usePackageInstallerActions from '@/utils/usePackageInstallerActions';
import type { PackageCardItem, PackageCardProgressView, UsePackageCardActionsResult } from './types';

export default function usePackageCardActions(item: PackageCardItem): UsePackageCardActionsResult {
  const { t } = useTranslation(['package', 'common']);
  const dispatch = useCatalogDispatch();
  const { error, setError, busyAction, isBusy, progress, noticeModal, closeNoticeModal, confirmNoticeModal, onDownload, onUpdate, onRemove } =
    usePackageInstallerActions({
      item,
      dispatch,
      missingInstallerMessage: t('actions.missingInstaller'),
    });
  const progressView: PackageCardProgressView = {
    ratio: progress.ratio ?? 0,
    label: progress.label ?? t('common:status.preparing'),
  };

  return {
    error,
    setError,
    busyAction,
    isBusy,
    progress: progressView,
    noticeModal,
    closeNoticeModal,
    confirmNoticeModal,
    onDownload,
    onUpdate,
    onRemove,
  };
}
