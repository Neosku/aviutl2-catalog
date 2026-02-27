import { useEffect } from 'react';
import type { Dispatch } from 'react';
import type { CatalogAction } from '../utils/catalogStore';
import { loadCatalogData } from '../utils/catalog';
import { detectInstalledVersionsMap, loadInstalledMap, saveInstalledSnapshot } from '../utils/installed-map';
import { formatUnknownError } from '../utils/errors';
import { ipc } from '../utils/invokeIpc';
import { logError } from '../utils/logging';
import { flushPackageStateQueue, maybeSendPackageStateSnapshot } from '../utils/package-state';
import { getSettings } from '../utils/settings';

type CatalogDispatch = Dispatch<CatalogAction>;

async function logBootstrapError(message: string, error: unknown): Promise<void> {
  try {
    await logError(`[bootstrap] ${message}: ${formatUnknownError(error)}`);
  } catch {}
}

export function useCatalogBootstrap(dispatch: CatalogDispatch): void {
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const root = document?.documentElement;
      try {
        const settings = await getSettings();
        let theme = settings && settings.theme ? String(settings.theme) : '';
        if (theme === 'noir') theme = 'darkmode';
        const isDark = theme !== 'lightmode';
        root?.classList.toggle('dark', isDark);
      } catch (error: unknown) {
        await logBootstrapError('theme apply failed', error);
      }
      root?.classList.remove('theme-init');

      try {
        await flushPackageStateQueue();
      } catch (error: unknown) {
        try {
          await logError(`[package-state] flush failed: ${formatUnknownError(error)}`);
        } catch {}
      }

      try {
        const installedMap = await loadInstalledMap();
        if (!cancelled) dispatch({ type: 'SET_INSTALLED_MAP', payload: installedMap });

        let catalogItems: Awaited<ReturnType<typeof loadCatalogData>>['items'] | null = null;
        try {
          const { items } = await loadCatalogData({ timeoutMs: 10000 });
          catalogItems = items;
        } catch (error: unknown) {
          console.warn('Catalog load failed:', error);
          await logBootstrapError('loadCatalogData failed', error);
        }

        if (Array.isArray(catalogItems) && catalogItems.length > 0) {
          const items = catalogItems;
          if (!cancelled) dispatch({ type: 'SET_ITEMS', payload: items });
          try {
            await ipc.setCatalogIndex({ items });
          } catch (error: unknown) {
            await logBootstrapError('set_catalog_index failed', error);
          }
          try {
            const detected = await detectInstalledVersionsMap(items);
            if (!cancelled) {
              dispatch({ type: 'SET_DETECTED_MAP', payload: detected });
              try {
                const snap = await saveInstalledSnapshot(detected);
                dispatch({ type: 'SET_INSTALLED_MAP', payload: snap });
              } catch (error: unknown) {
                await logBootstrapError('saveInstalledSnapshot failed', error);
              }
              try {
                await maybeSendPackageStateSnapshot(detected);
              } catch (error: unknown) {
                try {
                  await logError(`[package-state] snapshot failed: ${formatUnknownError(error)}`);
                } catch {}
              }
            }
          } catch (error: unknown) {
            await logBootstrapError('detectInstalledVersionsMap failed', error);
          }
        } else {
          if (!cancelled) {
            dispatch({
              type: 'SET_ERROR',
              payload: 'カタログの読み込みに失敗しました（ネットワーク/キャッシュなし）。',
            });
          }
        }
      } catch (error: unknown) {
        console.error('Failed to load catalog:', error);
        if (!cancelled) dispatch({ type: 'SET_ERROR', payload: 'カタログの読み込みに失敗しました。' });
      } finally {
        if (!cancelled) dispatch({ type: 'SET_LOADING', payload: false });
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [dispatch]);
}
