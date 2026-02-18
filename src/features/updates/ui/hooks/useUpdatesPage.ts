import { useCallback, useEffect, useMemo, useState } from 'react';
import { useCatalog, useCatalogDispatch } from '../../../../utils/catalogStore.jsx';
import { hasInstaller, logError, runInstallerForItem } from '../../../../utils/index.js';
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
  const { items } = useCatalog();
  const dispatch = useCatalogDispatch();

  const initialSnapshot = useMemo(() => snapshotRuntimeState(), []);
  const [bulkUpdating, setBulkUpdating] = useState(initialSnapshot.bulkUpdating);
  const [bulkProgress, setBulkProgress] = useState<BulkUpdateProgress | null>(initialSnapshot.bulkProgress);
  const [error, setErrorState] = useState(initialSnapshot.error);
  const [itemProgress, setItemProgress] = useState<ItemUpdateProgressMap>(initialSnapshot.itemProgress);

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

  const updatableItems = useMemo(
    () => items.filter((item) => item.installed && !item.isLatest && hasInstaller(item)),
    [items],
  );

  const handleBulkUpdate = useCallback(async () => {
    if (runtimeLocks.bulkUpdating || runtimeLocks.itemUpdatingIds.size > 0 || updatableItems.length === 0) return;
    runtimeLocks.bulkUpdating = true;
    patchRuntimeState({
      bulkUpdating: true,
      error: '',
      bulkProgress: { ratio: 0, status: '準備中…', current: 0, total: updatableItems.length },
    });

    const targets = updatableItems.slice();
    const total = targets.length || 1;
    const failed: Array<{ item: UpdatesItem; msg: string }> = [];

    try {
      for (let i = 0; i < targets.length; i += 1) {
        const item = targets[i];
        patchRuntimeState({
          bulkProgress: {
            ratio: 0,
            itemName: item.name,
            status: '準備中…',
            current: i + 1,
            total,
          },
        });

        try {
          await runInstallerForItem(item, dispatch, (progress: InstallerProgressPayload | null | undefined) => {
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
              status: '完了',
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
              status: 'エラー',
              current: i + 1,
              total,
            },
          });
        }
      }

      if (failed.length > 0) {
        const sample = failed[0];
        patchRuntimeState({
          error: `${failed.length}件のプラグインで更新に失敗しました（例: ${sample.item.name}: ${sample.msg}）`,
        });
      }
    } finally {
      runtimeLocks.bulkUpdating = false;
      patchRuntimeState({
        bulkUpdating: false,
        bulkProgress: null,
      });
    }
  }, [dispatch, updatableItems]);

  const handleUpdate = useCallback(
    async (item: UpdatesItem) => {
      if (runtimeLocks.bulkUpdating || runtimeLocks.itemUpdatingIds.has(item.id)) return;
      runtimeLocks.itemUpdatingIds.add(item.id);
      patchRuntimeState({ error: '' });
      setRuntimeItemProgress(item.id, { ratio: 0, label: '準備中…' });

      try {
        await runInstallerForItem(item, dispatch, (progress: InstallerProgressPayload | null | undefined) => {
          setRuntimeItemProgress(item.id, {
            ratio: toProgressRatio(progress),
            label: toProgressLabel(progress),
          });
        });
      } catch (itemError) {
        patchRuntimeState({
          error: `更新に失敗しました\n\n${toErrorMessage(itemError)}`,
        });
      } finally {
        runtimeLocks.itemUpdatingIds.delete(item.id);
        setRuntimeItemProgress(item.id, null);
      }
    },
    [dispatch],
  );

  const bulkPercent = Math.round((bulkProgress?.ratio ?? 0) * 100);
  const hasAnyItemUpdating = useMemo(
    () => runtimeLocks.itemUpdatingIds.size > 0 || Object.keys(itemProgress).length > 0,
    [itemProgress],
  );

  return {
    updatableItems,
    bulkUpdating,
    hasAnyItemUpdating,
    bulkProgress,
    bulkPercent,
    itemProgress,
    error,
    setError,
    handleBulkUpdate,
    handleUpdate,
  };
}
