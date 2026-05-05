import { useEffect } from 'react';
import { i18n } from '@/i18n';
import { loadBootstrapCatalog } from '@/utils/catalogClient';
import { buildCatalogBootstrapPackages, buildCatalogSearchIndexItems } from '@/utils/catalogBootstrapModel';
import type { CatalogDispatch } from '@/utils/catalogStore';
import { formatUnknownError } from '@/utils/errors';
import { detectInstalledVersionsMap, loadInstalledMap, saveInstalledSnapshot } from '@/utils/installed-map';
import { ipc } from '@/utils/invokeIpc';
import { logError } from '@/utils/logging';
import { flushPackageStateQueue, maybeSendPackageStateSnapshot } from '@/utils/package-state';
import { getSettings } from '@/utils/settings';

async function logBootstrapError(message: string, error: unknown): Promise<void> {
  try {
    await logError(`[bootstrap] ${message}: ${formatUnknownError(error)}`);
  } catch {}
}

async function runBootstrapStep(message: string, action: () => Promise<void>): Promise<void> {
  try {
    await action();
  } catch (error: unknown) {
    await logBootstrapError(message, error);
  }
}

export function useCatalogBootstrap(dispatch: CatalogDispatch): void {
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const root = document?.documentElement;
      await runBootstrapStep('theme apply failed', async () => {
        const settings = await getSettings();
        let theme = settings && settings.theme ? String(settings.theme) : '';
        if (theme === 'noir') theme = 'darkmode';
        const isDark = theme !== 'lightmode';
        root?.classList.toggle('dark', isDark);
      });
      root?.classList.remove('theme-init');

      await runBootstrapStep('package-state flush failed', async () => {
        await flushPackageStateQueue();
      });

      try {
        const installedMap = await loadInstalledMap();
        if (!cancelled) dispatch({ type: 'SET_INSTALLED_MAP', payload: installedMap });

        let catalogItems: ReturnType<typeof buildCatalogBootstrapPackages> | null = null;
        try {
          const bootstrapCatalog = await loadBootstrapCatalog({
            requestedLocale: i18n.resolvedLanguage || i18n.language,
            timeoutMs: 10000,
          });
          catalogItems = buildCatalogBootstrapPackages(bootstrapCatalog);
        } catch (error: unknown) {
          console.warn('Catalog load failed:', error);
          await logBootstrapError('loadBootstrapCatalog failed', error);
        }

        if (catalogItems?.length) {
          const items = catalogItems;
          if (!cancelled) dispatch({ type: 'SET_ITEMS', payload: items });
          await runBootstrapStep('set_catalog_index failed', async () => {
            await ipc.setCatalogIndex({ items: buildCatalogSearchIndexItems(items) });
          });
          try {
            const detected = await detectInstalledVersionsMap(items);
            if (!cancelled) {
              dispatch({ type: 'SET_DETECTED_MAP', payload: detected });
              await runBootstrapStep('saveInstalledSnapshot failed', async () => {
                const snap = await saveInstalledSnapshot(detected);
                dispatch({ type: 'SET_INSTALLED_MAP', payload: snap });
              });
              await runBootstrapStep('package-state snapshot failed', async () => {
                await maybeSendPackageStateSnapshot(detected);
              });
            }
          } catch (error: unknown) {
            await logBootstrapError('detectInstalledVersionsMap failed', error);
          }
        } else {
          if (!cancelled) {
            dispatch({
              type: 'SET_ERROR',
              payload: i18n.t('home:errors.catalogUnavailable'),
            });
          }
        }
      } catch (error: unknown) {
        console.error('Failed to load catalog:', error);
        if (!cancelled) dispatch({ type: 'SET_ERROR', payload: i18n.t('home:errors.catalogLoadFailed') });
      } finally {
        if (!cancelled) dispatch({ type: 'SET_LOADING', payload: false });
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [dispatch]);
}
