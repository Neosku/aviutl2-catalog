import { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useCatalog, useCatalogDispatch } from '@/utils/catalogStore';
import { resolveInstallableCatalogItem } from '@/utils/catalogInstallItem';
import { runInstallerForItem, runPackageRemoveAction } from '@/utils/installer';
import { logError } from '@/utils/logging';
import usePausedPackageUpdates from '@/utils/usePausedPackageUpdates';
import { toErrorMessage, toProgressLabel, toProgressRatio } from '../../model/helpers';
import type {
  BulkUpdateProgress,
  InstallerProgressPayload,
  ItemUpdateProgress,
  ItemUpdateProgressMap,
  UpdatesItem,
} from '../../model/types';

interface UpdatesRuntimeState {
  bulkUpdating: boolean;
  bulkProgress: BulkUpdateProgress | null;
  itemProgress: ItemUpdateProgressMap;
  error: string;
}

const runtimeState: UpdatesRuntimeState = {
  bulkUpdating: false,
  bulkProgress: null,
  itemProgress: {},
  error: '',
};

const runtimeLocks = {
  bulkUpdating: false,
  itemUpdatingIds: new Set<string>(),
};

const runtimeListeners = new Set<() => void>();

function emitRuntimeState(): void {
  runtimeListeners.forEach((listener) => {
    try {
      listener();
    } catch {}
  });
}

function subscribeRuntimeState(listener: () => void): () => void {
  runtimeListeners.add(listener);
  return () => {
    runtimeListeners.delete(listener);
  };
}

function snapshotRuntimeState(): UpdatesRuntimeState {
  return {
    bulkUpdating: runtimeState.bulkUpdating,
    bulkProgress: runtimeState.bulkProgress ? { ...runtimeState.bulkProgress } : null,
    itemProgress: { ...runtimeState.itemProgress },
    error: runtimeState.error,
  };
}

function patchRuntimeState(patch: Partial<UpdatesRuntimeState>): void {
  if (Object.prototype.hasOwnProperty.call(patch, 'bulkUpdating')) {
    runtimeState.bulkUpdating = Boolean(patch.bulkUpdating);
  }
  if (Object.prototype.hasOwnProperty.call(patch, 'bulkProgress')) {
    runtimeState.bulkProgress = patch.bulkProgress ? { ...patch.bulkProgress } : null;
  }
  if (Object.prototype.hasOwnProperty.call(patch, 'itemProgress')) {
    runtimeState.itemProgress = patch.itemProgress ? { ...patch.itemProgress } : {};
  }
  if (Object.prototype.hasOwnProperty.call(patch, 'error')) {
    runtimeState.error = String(patch.error || '');
  }
  emitRuntimeState();
}

function setRuntimeItemProgress(id: string, progress: ItemUpdateProgress | null): void {
  const next = { ...runtimeState.itemProgress };
  if (progress) {
    next[id] = progress;
  } else {
    delete next[id];
  }
  patchRuntimeState({ itemProgress: next });
}

export default function useUpdatesPage() {
  const { t } = useTranslation(['updates', 'common', 'package']);
  const { items } = useCatalog();
  const dispatch = useCatalogDispatch();
  const [bulkUpdating, setBulkUpdating] = useState(() => runtimeState.bulkUpdating);
  const [bulkProgress, setBulkProgress] = useState<BulkUpdateProgress | null>(() =>
    runtimeState.bulkProgress ? { ...runtimeState.bulkProgress } : null,
  );
  const [error, setErrorState] = useState(() => runtimeState.error);
  const [itemProgress, setItemProgress] = useState<ItemUpdateProgressMap>(() => ({ ...runtimeState.itemProgress }));
  const {
    isLoaded: pausedPackageUpdatesLoaded,
    pausedPackageIdSet,
    pauseBusyIdSet,
    togglePause,
  } = usePausedPackageUpdates();

  useEffect(() => {
    const syncFromRuntime = () => {
      const snapshot = snapshotRuntimeState();
      setBulkUpdating(snapshot.bulkUpdating);
      setBulkProgress(snapshot.bulkProgress);
      setErrorState(snapshot.error);
      setItemProgress(snapshot.itemProgress);
    };
    syncFromRuntime();
    return subscribeRuntimeState(syncFromRuntime);
  }, []);

  const setError = useCallback((nextError: string) => {
    patchRuntimeState({ error: nextError });
  }, []);

  const updatableItems = useMemo(() => items.filter((item) => item.installed && !item.isLatest), [items]);
  const bulkUpdatableItems = useMemo(
    () => (pausedPackageUpdatesLoaded ? updatableItems.filter((item) => !pausedPackageIdSet.has(item.id)) : []),
    [pausedPackageIdSet, pausedPackageUpdatesLoaded, updatableItems],
  );
  const pausedUpdatableItems = useMemo(
    () => (pausedPackageUpdatesLoaded ? updatableItems.filter((item) => pausedPackageIdSet.has(item.id)) : []),
    [pausedPackageIdSet, pausedPackageUpdatesLoaded, updatableItems],
  );

  const handleBulkUpdate = useCallback(async () => {
    if (!pausedPackageUpdatesLoaded) return;
    if (runtimeLocks.bulkUpdating || runtimeLocks.itemUpdatingIds.size > 0 || bulkUpdatableItems.length === 0) return;
    runtimeLocks.bulkUpdating = true;
    patchRuntimeState({
      bulkUpdating: true,
      error: '',
      bulkProgress: { ratio: 0, status: t('common:status.preparing'), current: 0, total: bulkUpdatableItems.length },
    });

    const targets = bulkUpdatableItems.slice();
    const total = targets.length || 1;
    const failed: Array<{ item: UpdatesItem; msg: string }> = [];

    try {
      for (let i = 0; i < targets.length; i += 1) {
        const item = targets[i];
        patchRuntimeState({
          bulkProgress: {
            ratio: 0,
            itemName: item.name,
            status: t('common:status.preparing'),
            current: i + 1,
            total,
          },
        });

        try {
          const resolvedItem = await resolveInstallableCatalogItem(item);
          if (!resolvedItem) {
            throw new Error(t('common:errors.unknown'));
          }
          await runInstallerForItem(resolvedItem, dispatch, (progress: InstallerProgressPayload | null | undefined) => {
            patchRuntimeState({
              bulkProgress: {
                ratio: toProgressRatio(progress),
                itemName: item.name,
                status: toProgressLabel(progress),
                current: i + 1,
                total,
              },
            });
          });
          patchRuntimeState({
            bulkProgress: {
              ratio: 1,
              itemName: item.name,
              status: t('common:status.done'),
              current: i + 1,
              total,
            },
          });
        } catch (itemError) {
          const message = toErrorMessage(itemError);
          failed.push({ item, msg: message });
          try {
            await logError(`[BulkUpdate] ${item.id}: ${message}`);
          } catch {}
          patchRuntimeState({
            bulkProgress: {
              ratio: 1,
              itemName: item.name,
              status: t('runtime.error'),
              current: i + 1,
              total,
            },
          });
        }
      }

      if (failed.length > 0) {
        const sample = failed[0];
        patchRuntimeState({
          error: t('errors.bulkFailed', { count: failed.length, name: sample.item.name, detail: sample.msg }),
        });
      }
    } finally {
      runtimeLocks.bulkUpdating = false;
      patchRuntimeState({
        bulkUpdating: false,
        bulkProgress: null,
      });
    }
  }, [bulkUpdatableItems, dispatch, pausedPackageUpdatesLoaded, t]);

  const handleUpdate = useCallback(
    async (item: UpdatesItem) => {
      if (!pausedPackageUpdatesLoaded) return;
      if (pausedPackageIdSet.has(item.id)) return;
      if (runtimeLocks.bulkUpdating || runtimeLocks.itemUpdatingIds.has(item.id)) return;
      runtimeLocks.itemUpdatingIds.add(item.id);
      patchRuntimeState({ error: '' });
      setRuntimeItemProgress(item.id, { ratio: 0, label: t('common:status.preparing') });

      try {
        const resolvedItem = await resolveInstallableCatalogItem(item);
        if (!resolvedItem) {
          throw new Error(t('common:errors.unknown'));
        }
        await runInstallerForItem(resolvedItem, dispatch, (progress: InstallerProgressPayload | null | undefined) => {
          setRuntimeItemProgress(item.id, {
            ratio: toProgressRatio(progress),
            label: toProgressLabel(progress),
          });
        });
      } catch (itemError) {
        patchRuntimeState({
          error: t('errors.updateFailed', { detail: toErrorMessage(itemError) }),
        });
      } finally {
        runtimeLocks.itemUpdatingIds.delete(item.id);
        setRuntimeItemProgress(item.id, null);
      }
    },
    [dispatch, pausedPackageIdSet, pausedPackageUpdatesLoaded, t],
  );

  const handleTogglePause = useCallback(
    async (item: UpdatesItem, paused: boolean) => {
      const id = String(item.id || '').trim();
      if (!id) return;
      if (!pausedPackageUpdatesLoaded) return;
      if (runtimeLocks.bulkUpdating || runtimeLocks.itemUpdatingIds.has(id)) return;

      try {
        await togglePause(id, paused);
      } catch (pauseError) {
        patchRuntimeState({
          error: t('errors.pauseSaveFailed', { detail: toErrorMessage(pauseError) }),
        });
      }
    },
    [pausedPackageUpdatesLoaded, t, togglePause],
  );

  const handleRemove = useCallback(
    async (item: UpdatesItem) => {
      if (runtimeLocks.bulkUpdating || runtimeLocks.itemUpdatingIds.has(item.id)) return;
      runtimeLocks.itemUpdatingIds.add(item.id);
      patchRuntimeState({ error: '' });
      setRuntimeItemProgress(item.id, { ratio: 0, label: t('package:actions.removing') });

      try {
        const resolvedItem = (await resolveInstallableCatalogItem(item)) ?? item;
        await runPackageRemoveAction(resolvedItem, dispatch);
      } catch (removeError) {
        patchRuntimeState({
          error: t('package:errors.actionFailed', {
            action: t('package:actions.remove'),
            detail: toErrorMessage(removeError),
          }),
        });
      } finally {
        runtimeLocks.itemUpdatingIds.delete(item.id);
        setRuntimeItemProgress(item.id, null);
      }
    },
    [dispatch, t],
  );

  const bulkPercent = Math.round((bulkProgress?.ratio ?? 0) * 100);
  const hasAnyItemUpdating = useMemo(
    () => runtimeLocks.itemUpdatingIds.size > 0 || Object.keys(itemProgress).length > 0,
    [itemProgress],
  );

  return {
    activeUpdatableItems: bulkUpdatableItems,
    pausedUpdatableItems,
    pausedPackageUpdatesLoaded,
    bulkUpdatableCount: bulkUpdatableItems.length,
    bulkUpdating,
    hasAnyItemUpdating,
    bulkProgress,
    bulkPercent,
    itemProgress,
    pausedPackageIdSet,
    pauseBusyIdSet,
    error,
    setError,
    handleBulkUpdate,
    handleUpdate,
    handleTogglePause,
    handleRemove,
  };
}
