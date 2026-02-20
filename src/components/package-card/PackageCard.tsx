import type { KeyboardEvent } from 'react';
import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { formatDate, hasInstaller } from '../../utils/index.js';
import ErrorDialog from '../ErrorDialog';
import { pickThumbnail } from './helpers';
import usePackageCardActions from './usePackageCardActions';
import PackageCardView from './PackageCardView';
import type { PackageCardProps } from './types';

export default function PackageCard({ item, listSearch = '' }: PackageCardProps) {
  const navigate = useNavigate();
  const {
    error,
    setError,
    downloading,
    updating,
    removing,
    downloadRatio,
    updateRatio,
    onDownload,
    onUpdate,
    onRemove,
  } = usePackageCardActions(item);

  const thumbnail = useMemo(() => pickThumbnail(item), [item]);
  const category = typeof item.type === 'string' ? item.type : 'その他';
  const isInstalled = Boolean(item.installed);
  const hasUpdate = isInstalled && !item.isLatest;
  const canInstall = hasInstaller(item);
  const lastUpdated = item.updatedAt ? formatDate(item.updatedAt).replace(/-/g, '/') : '?';

  const openDetail = () => {
    navigate(`/package/${encodeURIComponent(item.id)}`, { state: { fromSearch: listSearch } });
  };

  const handleCardKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key !== 'Enter' && event.key !== ' ') return;
    event.preventDefault();
    openDetail();
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
        downloading={downloading}
        updating={updating}
        removing={removing}
        downloadRatio={downloadRatio}
        updateRatio={updateRatio}
        onOpenDetail={openDetail}
        onCardKeyDown={handleCardKeyDown}
        onDownload={onDownload}
        onUpdate={onUpdate}
        onRemove={onRemove}
      />
      <ErrorDialog open={Boolean(error)} message={error} onClose={() => setError('')} />
    </>
  );
}
