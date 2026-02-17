import { useEffect, useRef } from 'react';
import type { PackageItem } from '../../model/types';

interface UsePackageAutoInstallParams {
  item: PackageItem | undefined;
  locationSearch: string;
  canInstall: boolean;
  downloading: boolean;
  onDownload: () => Promise<void>;
}

export default function usePackageAutoInstall({
  item,
  locationSearch,
  canInstall,
  downloading,
  onDownload,
}: UsePackageAutoInstallParams) {
  const autoInstallRef = useRef('');

  useEffect(() => {
    if (!item) return;
    const params = new URLSearchParams(locationSearch);
    const installRequested = params.get('install') === 'true';
    if (!installRequested) return;
    if (item.installed) return;
    if (!canInstall || downloading) return;
    const key = `${item.id}|${locationSearch}`;
    if (autoInstallRef.current === key) return;
    autoInstallRef.current = key;
    void onDownload();
  }, [item, locationSearch, canInstall, downloading, onDownload]);
}
