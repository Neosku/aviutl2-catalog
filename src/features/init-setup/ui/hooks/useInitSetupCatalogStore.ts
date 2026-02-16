import { useCallback, useEffect, useMemo, useState } from 'react';
import { loadCatalogData } from '../../../../utils/index.js';
import { safeLog } from '../../model/helpers';
import type {
  CatalogItem,
  PackageItemsMap,
  PackageState,
  PackageStatesMap,
  RequiredPackageRow,
} from '../../model/types';
import { createDefaultPackageState } from './initSetupPackageState';

interface UseInitSetupCatalogStoreParams {
  requiredPluginIds: string[];
  corePackageId: string;
}

export default function useInitSetupCatalogStore({ requiredPluginIds, corePackageId }: UseInitSetupCatalogStoreParams) {
  const [packageItems, setPackageItems] = useState<PackageItemsMap>({});
  const [packageStates, setPackageStates] = useState<PackageStatesMap>({});
  const [packagesLoading, setPackagesLoading] = useState(false);
  const [packagesError, setPackagesError] = useState('');

  const fetchCatalogList = useCallback(async () => {
    try {
      const result = (await loadCatalogData({ timeoutMs: 10000 })) as { items?: CatalogItem[] };
      const items = Array.isArray(result?.items) ? result.items : [];
      if (items.length === 0) throw new Error('catalog data unavailable');
      return items;
    } catch (catalogError) {
      await safeLog('[init-window] catalog load failed', catalogError);
      throw catalogError;
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!requiredPluginIds.length) return;
      setPackagesLoading(true);
      setPackagesError('');
      try {
        const list = await fetchCatalogList();
        const nextItems: PackageItemsMap = {};
        const missing: string[] = [];
        requiredPluginIds.forEach((id) => {
          const found = list.find((item) => item && item.id === id) || null;
          if (!found) missing.push(id);
          nextItems[id] = found;
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
            setPackagesError(`一部のパッケージ情報を取得できませんでした: ${missing.join(', ')}`);
          }
        }
      } catch (requiredLoadError) {
        if (!cancelled) setPackagesError('必須パッケージの情報を読み込めませんでした。');
        await safeLog('[init-window] required packages load failed', requiredLoadError);
      } finally {
        if (!cancelled) setPackagesLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [fetchCatalogList, requiredPluginIds]);

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

  const applyDetectedVersions = useCallback((versions: Record<string, string>) => {
    const detectedIds = Object.keys(versions || {});
    if (detectedIds.length === 0) return;
    setPackageStates((prev) => {
      const next = { ...prev };
      detectedIds.forEach((id) => {
        const current = next[id] || createDefaultPackageState();
        const version = String(versions[id] || '').trim();
        next[id] = { ...current, installed: version !== '', error: '' };
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
      const list = await fetchCatalogList();
      const found = list.find((item) => item && item.id === id) || null;
      if (found) {
        setPackageItems((prev) => ({ ...prev, [id]: found }));
        setPackageStates((prev) => {
          const next = { ...prev };
          if (!next[id]) next[id] = createDefaultPackageState();
          return next;
        });
        return found;
      }
      throw new Error(`パッケージ情報が見つかりません: ${id}`);
    },
    [fetchCatalogList, packageItems],
  );

  return {
    packageItems,
    packagesLoading,
    packagesError,
    requiredPackages,
    allRequiredInstalled,
    coreProgressRatio,
    updatePackageState,
    applyDetectedVersions,
    ensurePackageItem,
  };
}
