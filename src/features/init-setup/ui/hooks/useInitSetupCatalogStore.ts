import { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { resolveInstallableCatalogItem } from '@/utils/catalogInstallItem';
import { useCatalog } from '@/utils/catalogStore';
import { isInstalledDetectResult, type DetectResultMap } from '@/utils/detectResult';
import { safeLog } from '../../model/helpers';
import type { PackageItemsMap, PackageState, PackageStatesMap, RequiredPackageRow } from '../../model/types';
import { createDefaultPackageState } from './initSetupPackageState';

interface UseInitSetupCatalogStoreParams {
  requiredPluginIds: string[];
  corePackageId: string;
}

export default function useInitSetupCatalogStore({ requiredPluginIds, corePackageId }: UseInitSetupCatalogStoreParams) {
  const { t } = useTranslation('initSetup');
  const { items, loading: catalogLoading, error: catalogError } = useCatalog();
  const [packageItems, setPackageItems] = useState<PackageItemsMap>({});
  const [packageStates, setPackageStates] = useState<PackageStatesMap>({});
  const [packagesLoading, setPackagesLoading] = useState(false);
  const [packagesError, setPackagesError] = useState('');

  const fetchPackageItems = useCallback(async () => {
    if (catalogLoading) {
      throw new Error('catalog bootstrap is still loading');
    }
    if (catalogError) {
      throw new Error(catalogError);
    }

    try {
      const nextItems: PackageItemsMap = {};
      await Promise.all(
        requiredPluginIds.map(async (id) => {
          const baseItem = items.find((item) => item && item.id === id);
          nextItems[id] = await resolveInstallableCatalogItem(baseItem);
        }),
      );
      return nextItems;
    } catch (loadError) {
      await safeLog('[init-window] catalog load failed', loadError);
      throw loadError;
    }
  }, [catalogError, catalogLoading, items, requiredPluginIds]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!requiredPluginIds.length) return;
      if (catalogLoading) return;
      setPackagesLoading(true);
      setPackagesError('');
      try {
        const nextItems = await fetchPackageItems();
        const missing: string[] = [];
        requiredPluginIds.forEach((id) => {
          const found = nextItems[id] || null;
          if (!found) missing.push(id);
        });
        if (!cancelled) {
          setPackageItems(nextItems);
          setPackageStates((prev) => {
            const next = { ...prev };
            requiredPluginIds.forEach((id) => {
              if (!next[id]) next[id] = createDefaultPackageState();
            });
            return next;
          });
          if (missing.length) {
            setPackagesError(t('errors.packageInfoPartialFailed', { ids: missing.join(', ') }));
          }
        }
      } catch (requiredLoadError) {
        if (!cancelled) setPackagesError(t('errors.requiredPackagesLoadFailed'));
        await safeLog('[init-window] required packages load failed', requiredLoadError);
      } finally {
        if (!cancelled) setPackagesLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [catalogLoading, fetchPackageItems, requiredPluginIds, t]);

  const updatePackageState = useCallback(
    (id: string, updater: Partial<PackageState> | ((current: PackageState) => Partial<PackageState>)) => {
      setPackageStates((prev) => {
        const current = prev[id] || createDefaultPackageState();
        const nextPatch = typeof updater === 'function' ? updater(current) : updater;
        return { ...prev, [id]: { ...current, ...nextPatch } };
      });
    },
    [],
  );

  const applyDetectedVersions = useCallback((versions: DetectResultMap) => {
    const detectedIds = Object.keys(versions || {});
    if (detectedIds.length === 0) return;
    setPackageStates((prev) => {
      const next = { ...prev };
      detectedIds.forEach((id) => {
        const current = next[id] || createDefaultPackageState();
        next[id] = { ...current, installed: isInstalledDetectResult(versions[id]), error: '' };
      });
      return next;
    });
  }, []);

  const requiredPackages = useMemo<RequiredPackageRow[]>(
    () =>
      requiredPluginIds.map((id) => ({
        id,
        item: packageItems[id] || null,
        state: packageStates[id] || createDefaultPackageState(),
      })),
    [packageItems, packageStates, requiredPluginIds],
  );

  const allRequiredInstalled = useMemo(
    () => requiredPackages.every(({ state }) => state.installed),
    [requiredPackages],
  );
  const corePackageState = packageStates[corePackageId] || createDefaultPackageState();
  const coreProgressRatio = corePackageState.progress?.ratio ?? 0;

  const ensurePackageItem = useCallback(
    async (id: string) => {
      const cached = packageItems[id];
      if (cached) return cached;
      if (catalogLoading) {
        throw new Error(t('errors.requiredPackagesLoadFailed'));
      }
      const baseItem = items.find((item) => item && item.id === id);
      const found = await resolveInstallableCatalogItem(baseItem);
      if (found) {
        setPackageItems((prev) => ({ ...prev, [id]: found }));
        setPackageStates((prev) => {
          const next = { ...prev };
          if (!next[id]) next[id] = createDefaultPackageState();
          return next;
        });
        return found;
      }
      throw new Error(t('errors.packageInfoMissing', { id }));
    },
    [catalogLoading, items, packageItems, t],
  );

  return {
    packageItems,
    packagesLoading: packagesLoading || (catalogLoading && requiredPluginIds.length > 0),
    packagesError,
    requiredPackages,
    allRequiredInstalled,
    coreProgressRatio,
    updatePackageState,
    applyDetectedVersions,
    ensurePackageItem,
  };
}
