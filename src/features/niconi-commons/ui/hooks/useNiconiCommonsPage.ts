import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import * as tauriShell from '@tauri-apps/plugin-shell';
import { useCatalog } from '@/utils/catalogStore';
import { logError } from '@/utils/logging';
import { normalize } from '@/utils/text';
import { exportNiconiCommonsIdsFromSelectedItems } from '../../model/export';
import {
  buildDeselectedIds,
  buildInitialSelectedMap,
  buildSelectedNiconiCommonsIds,
  isInstalledNiconiCommonsItem,
  loadDeselectedNiconiCommonsIds,
  saveDeselectedNiconiCommonsIds,
} from '../../model/selection';
import type { CopyState, EligibleItem, SelectedMap } from '../../model/types';

const EMPTY_COPY_STATE: CopyState = { ok: false, count: 0 };

export default function useNiconiCommonsPage() {
  const { i18n } = useTranslation();
  const { items } = useCatalog();
  const skipPersistRef = useRef(true);

  const [query, setQuery] = useState('');
  const [selectedMap, setSelectedMap] = useState<SelectedMap>({});
  const [copyState, setCopyState] = useState<CopyState>(EMPTY_COPY_STATE);

  const eligibleItems = useMemo((): EligibleItem[] => {
    return items.filter(isInstalledNiconiCommonsItem);
  }, [items]);

  const sortedEligible = useMemo((): EligibleItem[] => {
    return eligibleItems.toSorted((a, b) => String(a.name || '').localeCompare(String(b.name || ''), i18n.language));
  }, [eligibleItems, i18n.language]);

  const queryKey = useMemo(() => normalize(query), [query]);

  const filteredItems = useMemo(() => {
    if (!queryKey) return sortedEligible;
    return sortedEligible.filter((item) => {
      const nameKey = normalize(item.name || '');
      const idKey = normalize(item.id || '');
      const authorKey = normalize(item.author || '');
      const commonsKey = normalize(item.niconiCommonsId || '');
      return (
        nameKey.includes(queryKey) ||
        idKey.includes(queryKey) ||
        authorKey.includes(queryKey) ||
        commonsKey.includes(queryKey)
      );
    });
  }, [queryKey, sortedEligible]);

  useEffect(() => {
    setSelectedMap(() => buildInitialSelectedMap(eligibleItems, loadDeselectedNiconiCommonsIds()));
  }, [eligibleItems]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (skipPersistRef.current) {
      skipPersistRef.current = false;
      return;
    }
    const selectionInitialized = eligibleItems.every((item) =>
      Object.prototype.hasOwnProperty.call(selectedMap, item.id),
    );
    if (!selectionInitialized) return;

    saveDeselectedNiconiCommonsIds(buildDeselectedIds(eligibleItems, selectedMap));
    void exportNiconiCommonsIdsFromSelectedItems(eligibleItems, selectedMap).catch((error: unknown) => {
      void logError(`[niconi-commons] export failed: ${String(error)}`);
    });
  }, [eligibleItems, selectedMap]);

  const selectedIds = useMemo(() => {
    return buildSelectedNiconiCommonsIds(eligibleItems, selectedMap);
  }, [eligibleItems, selectedMap]);

  const selectedCount = selectedIds.length;
  const totalEligible = eligibleItems.length;
  const visibleCount = filteredItems.length;
  const allVisibleSelected = visibleCount > 0 && filteredItems.every((item) => selectedMap[item.id]);

  const toggleItem = useCallback((id: string) => {
    setSelectedMap((prev) => ({
      ...prev,
      [id]: !prev[id],
    }));
  }, []);

  const toggleAllVisible = useCallback(() => {
    setSelectedMap((prev) => {
      const next = { ...prev };
      if (allVisibleSelected) {
        filteredItems.forEach((item) => {
          next[item.id] = false;
        });
      } else {
        filteredItems.forEach((item) => {
          next[item.id] = true;
        });
      }
      return next;
    });
  }, [allVisibleSelected, filteredItems]);

  const copyIds = useCallback(async (ids: string[]) => {
    if (!ids.length) return;
    try {
      await navigator.clipboard.writeText(ids.join(' '));
      setCopyState({ ok: true, count: ids.length });
    } catch {
      setCopyState(EMPTY_COPY_STATE);
    }
  }, []);

  const onCopySelected = useCallback(() => {
    void copyIds(selectedIds);
  }, [copyIds, selectedIds]);

  const onCopyCommonsId = useCallback(
    (commonsId: string) => {
      if (!commonsId) return;
      void copyIds([commonsId]);
    },
    [copyIds],
  );

  const onOpenGuide = useCallback(async () => {
    try {
      await tauriShell.open('https://qa.nicovideo.jp/faq/show/863');
    } catch {}
  }, []);

  useEffect(() => {
    if (!copyState.ok) return;
    const timer = setTimeout(() => setCopyState(EMPTY_COPY_STATE), 2000);
    return () => clearTimeout(timer);
  }, [copyState.ok]);

  return {
    copyState,
    query,
    setQuery,
    filteredItems,
    selectedMap,
    selectedCount,
    totalEligible,
    visibleCount,
    allVisibleSelected,
    toggleAllVisible,
    toggleItem,
    onCopySelected,
    onCopyCommonsId,
    onOpenGuide,
  };
}
