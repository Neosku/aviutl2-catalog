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

const PACKAGE_STATE_FLUSH_DELAY_MS = 8000;
const PACKAGE_STATE_SNAPSHOT_DELAY_MS = 12000;

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

async function captureBootstrapResult<T>(
  promise: Promise<T>,
): Promise<{ ok: true; value: T } | { ok: false; error: unknown }> {
  try {
    return { ok: true, value: await promise };
  } catch (error: unknown) {
    return { ok: false, error };
  }
}

export function useCatalogBootstrap(dispatch: CatalogDispatch): void {
  useEffect(() => {
    let cancelled = false;
    let detectedSnapshotApplied = false;
    const delayedTaskIds: ReturnType<typeof setTimeout>[] = [];
    const scheduleDelayedBootstrapStep = (delayMs: number, message: string, action: () => Promise<void>) => {
      const taskId = setTimeout(() => {
        if (cancelled) return;
        void runBootstrapStep(message, action);
      }, delayMs);
      delayedTaskIds.push(taskId);
    };

    scheduleDelayedBootstrapStep(PACKAGE_STATE_FLUSH_DELAY_MS, 'package-state flush failed', async () => {
      await flushPackageStateQueue();
    });

    const settingsPromise = captureBootstrapResult(getSettings());
    const installedMapPromise = captureBootstrapResult(loadInstalledMap());
    const bootstrapCatalogPromise = captureBootstrapResult(
      loadBootstrapCatalog({
        requestedLocale: i18n.resolvedLanguage || i18n.language,
        timeoutMs: 10000,
      }),
    );

    void (async () => {
      const installedMapResult = await installedMapPromise;
      if (!installedMapResult.ok) {
        await logBootstrapError('loadInstalledMap failed', installedMapResult.error);
        return;
      }
      if (!cancelled && !detectedSnapshotApplied) {
        dispatch({ type: 'SET_INSTALLED_MAP', payload: installedMapResult.value });
      }
    })();

    (async () => {
      const root = document?.documentElement;
      await runBootstrapStep('theme apply failed', async () => {
        const settingsResult = await settingsPromise;
        if (!settingsResult.ok) {
          throw settingsResult.error;
        }
        const settings = settingsResult.value;
        let theme = settings && settings.theme ? String(settings.theme) : '';
        if (theme === 'noir') theme = 'darkmode';
        const isDark = theme !== 'lightmode';
        root?.classList.toggle('dark', isDark);
      });
      root?.classList.remove('theme-init');

      try {
        let catalogItems: ReturnType<typeof buildCatalogBootstrapPackages> | null = null;
        const bootstrapCatalogResult = await bootstrapCatalogPromise;
        if (bootstrapCatalogResult.ok) {
          catalogItems = buildCatalogBootstrapPackages(bootstrapCatalogResult.value);
        } else {
          console.warn('Catalog load failed:', bootstrapCatalogResult.error);
          await logBootstrapError('loadBootstrapCatalog failed', bootstrapCatalogResult.error);
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
                detectedSnapshotApplied = true;
                dispatch({ type: 'SET_INSTALLED_MAP', payload: snap });
              });
              scheduleDelayedBootstrapStep(
                PACKAGE_STATE_SNAPSHOT_DELAY_MS,
                'package-state snapshot failed',
                async () => {
                  await maybeSendPackageStateSnapshot(detected);
                },
              );
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
      delayedTaskIds.forEach((taskId) => clearTimeout(taskId));
    };
  }, [dispatch]);
}
