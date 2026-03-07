import { useNavigate } from 'react-router-dom';
import { buildPackageDetailHref } from '../../features/package/model/helpers';
import { hasInstaller } from '../../utils/installer';
import { formatDate } from '../../utils/text';
import ErrorDialog from '../ErrorDialog';
import { pickThumbnail } from './helpers';
import usePackageCardActions from './usePackageCardActions';
import PackageCardView from './PackageCardView';
import type { PackageCardProps } from './types';

export default function PackageCard({ item, listSearch = '', onBeforeOpenDetail }: PackageCardProps) {
  const navigate = useNavigate();
  const { error, setError, busyAction, isBusy, progress, onDownload, onUpdate, onRemove } = usePackageCardActions(item);

  const thumbnail = pickThumbnail(item);
  const category = typeof item.type === 'string' ? item.type : 'その他';
  const isInstalled = Boolean(item.installed);
  const hasUpdate = isInstalled && !item.isLatest;
  const canInstall = hasInstaller(item);
  const lastUpdated = item.updatedAt ? formatDate(item.updatedAt).replace(/-/g, '/') : '?';

  const openDetail = () => {
    onBeforeOpenDetail?.();
    navigate(buildPackageDetailHref(item.id, listSearch));
  };

  return (
    <>
      <PackageCardView
        item={item}
        thumbnail={thumbnail}
        category={category}
        lastUpdated={lastUpdated}
        isInstalled={isInstalled}
        hasUpdate={hasUpdate}
        canInstall={canInstall}
        busyAction={busyAction}
        isBusy={isBusy}
        progress={progress}
        onOpenDetail={openDetail}
        onDownload={onDownload}
        onUpdate={onUpdate}
        onRemove={onRemove}
      />
      <ErrorDialog open={Boolean(error)} message={error} onClose={() => setError('')} />
    </>
  );
}
