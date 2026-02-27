import { useCallback, useEffect, useState } from 'react';
import * as tauriCore from '@tauri-apps/api/core';
import { safeLog } from '../../model/helpers';
import type { CatalogItem, InitSetupStep, PackageItemsMap, PackageVersionsMap } from '../../model/types';

interface UseInitSetupVersionDetectionParams {
  step: InitSetupStep;
  requiredPluginIds: string[];
  packageItems: PackageItemsMap;
  onDetected: (versions: Record<string, string>) => void;
}

export default function useInitSetupVersionDetection({
  step,
  requiredPluginIds,
  packageItems,
  onDetected,
}: UseInitSetupVersionDetectionParams) {
  const [packageVersions, setPackageVersions] = useState<PackageVersionsMap>({});
  const [versionsDetected, setVersionsDetected] = useState(false);

  const markVersionsDirty = useCallback(() => {
    setVersionsDetected(false);
  }, []);

  useEffect(() => {
    if (step === 'packages') {
      markVersionsDirty();
    }
  }, [markVersionsDirty, step]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (step !== 'packages') return;
      if (versionsDetected) return;
      try {
        const itemsForDetect = requiredPluginIds.map((id) => packageItems[id]).filter(Boolean) as CatalogItem[];
        if (itemsForDetect.length === 0) return;
        const result = await tauriCore.invoke<Record<string, string> | null>('detect_versions_map', {
          items: itemsForDetect,
        });
        if (cancelled) return;
        const versions = result && typeof result === 'object' ? result : {};
        setPackageVersions(versions);
        onDetected(versions);
        setVersionsDetected(true);
      } catch (detectError) {
        await safeLog('[init-window] detect_versions_map failed', detectError);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [onDetected, packageItems, requiredPluginIds, step, versionsDetected]);

  return {
    packageVersions,
    markVersionsDirty,
  };
}
