import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { open } from '@tauri-apps/plugin-shell';
import * as z from 'zod';
import { useCatalog } from '../../../../utils/catalogStore.jsx';
import { normalize } from '../../../../utils/index.js';
import type { CopyState, EligibleItem, SelectedMap } from '../../model/types';

const DESELECTED_IDS_STORAGE_KEY = 'niconiCommonsDeselectedIds';
const EMPTY_COPY_STATE: CopyState = { ok: false, count: 0 };

export default function useNiconiCommonsPage() {
  const { items } = useCatalog();
  const skipPersistRef = useRef(true);

  const [query, setQuery] = useState('');
  const [selectedMap, setSelectedMap] = useState<SelectedMap>({});
  const [copyState, setCopyState] = useState<CopyState>(EMPTY_COPY_STATE);

  const eligibleItems = useMemo((): EligibleItem[] => {
    return items
      .filter((item) => item && item.installed)
      .filter((item): item is EligibleItem => Boolean(item.niconiCommonsId));
  }, [items]);

  const sortedEligible = useMemo((): EligibleItem[] => {
    return eligibleItems.toSorted((a, b) => String(a.name || '').localeCompare(String(b.name || ''), 'ja'));
  }, [eligibleItems]);

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
    if (typeof window === 'undefined') return;
    const schema = z.array(z.string());
    let deselectedIds: string[] = [];

    try {
      const raw = window.localStorage.getItem(DESELECTED_IDS_STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        const result = schema.safeParse(parsed);
        if (result.success) {
          deselectedIds = result.data.filter(Boolean);
        }
      }
    } catch {}

    const deselectedSet = new Set(deselectedIds);
    setSelectedMap(() => {
      const next: Record<string, true> = {};
      eligibleItems.forEach((item) => {
        if (!deselectedSet.has(item.id)) next[item.id] = true;
      });
      return next;
    });
  }, [eligibleItems]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (skipPersistRef.current) {
      skipPersistRef.current = false;
      return;
    }

    const deselected = eligibleItems.filter((item) => !selectedMap[item.id]).map((item) => item.id);
    try {
      window.localStorage.setItem(DESELECTED_IDS_STORAGE_KEY, JSON.stringify(deselected));
    } catch {}
  }, [eligibleItems, selectedMap]);

  const selectedIds = useMemo(() => {
    return eligibleItems.filter((item) => selectedMap[item.id]).map((item) => item.niconiCommonsId);
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
      await open('https://qa.nicovideo.jp/faq/show/863');
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
