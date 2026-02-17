import { useCallback, useState } from 'react';
import { safeLog } from '../../model/helpers';
import type { RequiredPackageRow } from '../../model/types';

interface UseInitSetupBulkInstallParams {
  allRequiredInstalled: boolean;
  requiredPackages: RequiredPackageRow[];
  downloadRequiredPackage: (id: string) => Promise<boolean>;
  onDone: () => void;
}

export default function useInitSetupBulkInstall({
  allRequiredInstalled,
  requiredPackages,
  downloadRequiredPackage,
  onDone,
}: UseInitSetupBulkInstallParams) {
  const [bulkDownloading, setBulkDownloading] = useState(false);
  const [packagesDownloadError, setPackagesDownloadError] = useState('');

  const handleBulkInstallAndNext = useCallback(async () => {
    if (allRequiredInstalled) {
      onDone();
      return;
    }
    setPackagesDownloadError('');
    setBulkDownloading(true);
    try {
      let hasFailure = false;
      for (const { id, state } of requiredPackages) {
        if (state.installed) continue;
        const success = await downloadRequiredPackage(id);
        if (!success) hasFailure = true;
      }
      if (hasFailure) {
        setPackagesDownloadError('一部のインストールに失敗しました。');
      } else {
        onDone();
      }
    } catch (bulkInstallError) {
      setPackagesDownloadError('エラーが発生しました。');
      await safeLog('[init-window] bulk install and next failed', bulkInstallError);
    } finally {
      setBulkDownloading(false);
    }
  }, [allRequiredInstalled, downloadRequiredPackage, onDone, requiredPackages]);

  return {
    bulkDownloading,
    packagesDownloadError,
    handleBulkInstallAndNext,
  };
}
