/**
 * カタログ読込・検索・選択状態を管理する hook
 */
import { useCallback, useDeferredValue, useEffect, useMemo, useRef, useState } from 'react';
import { useCatalog } from '../../../../utils/catalogStore.jsx';
import { buildPackageEntry, createEmptyPackageForm, entryToForm } from '../../model/form';
import {
  cleanupImagePreviews,
  commaListToArray,
  getErrorMessage,
  normalizeArrayText,
  resolveBaseUrl,
} from '../../model/helpers';
import type { RegisterPackageForm } from '../../model/types';
import type { CatalogItem } from '../types';

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

type DeepPartial<T> = {
  [K in keyof T]?: T[K] extends Array<infer U> ? Array<DeepPartial<U>> : T[K] extends object ? DeepPartial<T[K]> : T[K];
};

type CatalogPatch = DeepPartial<CatalogItem> & { id: string };

function extractCatalogArray(json: unknown): unknown[] | null {
  if (Array.isArray(json)) return json;
  if (!isPlainObject(json)) return null;
  return Array.isArray(json.packages) ? json.packages : null;
}

function mergeDefinedFields<T>(base: T, patch: DeepPartial<T>): T {
  if (!isPlainObject(base) || !isPlainObject(patch)) return patch as T;
  const next: Record<string, unknown> = { ...base };
  Object.entries(patch).forEach(([key, value]) => {
    if (typeof value === 'undefined') return;
    const baseValue = next[key];
    if (isPlainObject(baseValue) && isPlainObject(value)) {
      next[key] = mergeDefinedFields(baseValue, value);
      return;
    }
    next[key] = value;
  });
  return next as T;
}

function isDeepEqual(left: unknown, right: unknown): boolean {
  if (Object.is(left, right)) return true;
  if (Array.isArray(left) || Array.isArray(right)) {
    if (!Array.isArray(left) || !Array.isArray(right)) return false;
    if (left.length !== right.length) return false;
    for (let i = 0; i < left.length; i += 1) {
      if (!isDeepEqual(left[i], right[i])) return false;
    }
    return true;
  }
  if (isPlainObject(left) || isPlainObject(right)) {
    if (!isPlainObject(left) || !isPlainObject(right)) return false;
    const leftKeys = Object.keys(left);
    const rightKeys = Object.keys(right);
    if (leftKeys.length !== rightKeys.length) return false;
    for (const key of leftKeys) {
      if (!Object.prototype.hasOwnProperty.call(right, key)) return false;
      if (!isDeepEqual(left[key], right[key])) return false;
    }
    return true;
  }
  return false;
}

function extractCatalogPatchList(json: unknown): CatalogPatch[] {
  const rawList = extractCatalogArray(json);
  if (!Array.isArray(rawList)) {
    throw new Error('入力形式が不正です。');
  }
  const list = rawList
    .filter((item): item is Record<string, unknown> => isPlainObject(item))
    .map((item) => {
      const id = typeof item.id === 'string' ? item.id.trim() : '';
      if (!id) return null;
      return { ...(item as DeepPartial<CatalogItem>), id } as CatalogPatch;
    })
    .filter((item): item is CatalogPatch => item !== null);
  if (list.length === 0) {
    throw new Error('上書き対象の要素がありません。');
  }
  return list;
}

function createCatalogItemFromPatch(patch: CatalogPatch): CatalogItem {
  const emptyForm = createEmptyPackageForm();
  emptyForm.id = patch.id;
  const base = buildPackageEntry(emptyForm, []);
  const merged = mergeDefinedFields(base, patch);
  const nextItem: CatalogItem = { ...merged, id: patch.id };
  return nextItem;
}

function isCatalogItem(value: unknown): value is CatalogItem {
  if (!isPlainObject(value)) return false;
  if (typeof value.id !== 'string') return false;
  if (typeof value.name !== 'string') return false;
  if (typeof value.type !== 'string') return false;
  if (typeof value.summary !== 'string') return false;
  if (typeof value.description !== 'string') return false;
  if (typeof value.author !== 'string') return false;
  if (typeof value.repoURL !== 'string') return false;
  if (typeof value['latest-version'] !== 'string') return false;
  if (!Array.isArray(value.licenses)) return false;
  if (!Array.isArray(value.tags)) return false;
  if (!Array.isArray(value.dependencies)) return false;
  if (!Array.isArray(value.images)) return false;
  if (!isPlainObject(value.installer)) return false;
  if (!Array.isArray(value.version)) return false;
  return true;
}

interface UseRegisterCatalogStateArgs {
  setPackageForm: React.Dispatch<React.SetStateAction<RegisterPackageForm>>;
  setDescriptionTab: React.Dispatch<React.SetStateAction<string>>;
  setExpandedVersionKeys: React.Dispatch<React.SetStateAction<Set<string>>>;
  setError: React.Dispatch<React.SetStateAction<string>>;
  onUserEdit?: () => void;
}

export default function useRegisterCatalogState({
  setPackageForm,
  setDescriptionTab,
  setExpandedVersionKeys,
  setError,
  onUserEdit,
}: UseRegisterCatalogStateArgs) {
  const [catalogItems, setCatalogItems] = useState<CatalogItem[]>([]);
  const [catalogLoadState, setCatalogLoadState] = useState<'idle' | 'loading' | 'loaded' | 'error'>('idle');
  const [catalogBaseUrl, setCatalogBaseUrl] = useState('');
  const [packageSearch, setPackageSearch] = useState('');
  const deferredPackageSearch = useDeferredValue(packageSearch);
  const [selectedPackageId, setSelectedPackageId] = useState('');
  const [initialTags, setInitialTags] = useState<string[]>([]);
  const [currentTags, setCurrentTags] = useState<string[]>([]);
  const tagListRef = useRef<string[]>([]);
  const { allTags } = useCatalog();

  const tagCandidates = useMemo(() => {
    const source = Array.isArray(allTags) ? allTags : [];
    const set = new Set<string>(source.map((tag) => String(tag || '')));
    return Array.from(set).toSorted((a, b) => a.localeCompare(b, 'ja'));
  }, [allTags]);

  const handleTagsChange = useCallback(
    (list: string[]) => {
      onUserEdit?.();
      const normalized = normalizeArrayText(list);
      tagListRef.current = normalized;
      setCurrentTags(normalized);
    },
    [onUserEdit],
  );

  const applyTagList = useCallback((list: string[]) => {
    const normalized = normalizeArrayText(list);
    setInitialTags(normalized);
    setCurrentTags(normalized);
    tagListRef.current = normalized;
  }, []);

  useEffect(() => {
    tagListRef.current = normalizeArrayText(initialTags);
  }, [initialTags]);

  const loadCatalog = useCallback(async () => {
    if (catalogLoadState !== 'idle') return;
    setCatalogLoadState('loading');
    try {
      const endpoint = import.meta.env.VITE_REMOTE || './index.json';
      const res = await fetch(endpoint);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();
      const rawList = extractCatalogArray(json);
      const list = Array.isArray(rawList) ? rawList.filter((item): item is CatalogItem => isCatalogItem(item)) : [];
      setCatalogItems(list);
      const base = resolveBaseUrl(res.url || endpoint) || '';
      setCatalogBaseUrl(base);
      if (list.length) {
        // 初回ロード時は先頭パッケージを選択し、編集開始までの操作を最短化する。
        const first = list[0];
        setSelectedPackageId(first?.id || '');
        const form = entryToForm(first, base);
        const initialTagList = commaListToArray(form.tagsText);
        setInitialTags(initialTagList);
        tagListRef.current = initialTagList;
        setCurrentTags(initialTagList);
        setPackageForm((prev) => {
          cleanupImagePreviews(prev.images);
          return form;
        });
      } else {
        setSelectedPackageId('');
        setPackageForm(createEmptyPackageForm());
      }
      setCatalogLoadState('loaded');
    } catch (e: unknown) {
      setError(`index.json の取得に失敗しました: ${getErrorMessage(e)}`);
      setCatalogLoadState('error');
    }
  }, [catalogLoadState, setError, setPackageForm]);

  useEffect(() => {
    loadCatalog();
  }, [loadCatalog]);

  const filteredPackages = useMemo(() => {
    const query = deferredPackageSearch.trim().toLowerCase();
    const items = Array.isArray(catalogItems) ? catalogItems : [];
    if (!query) return items;
    return items.filter((item) => {
      const name = String(item?.name || '').toLowerCase();
      const author = String(item?.author || '').toLowerCase();
      return name.includes(query) || author.includes(query);
    });
  }, [catalogItems, deferredPackageSearch]);

  const handleSelectPackage = useCallback(
    (item: CatalogItem | null) => {
      if (!item) {
        setSelectedPackageId('');
        setInitialTags([]);
        tagListRef.current = [];
        setPackageForm((prev) => {
          cleanupImagePreviews(prev.images);
          return createEmptyPackageForm();
        });
        setDescriptionTab('edit');
        setExpandedVersionKeys(new Set());
        return;
      }
      // 選択切替時は古い画像 URL を必ず解放し、メモリリークを防ぐ。
      const form = entryToForm(item, catalogBaseUrl);
      setSelectedPackageId(item.id || '');
      const tags = commaListToArray(form.tagsText);
      setInitialTags(tags);
      tagListRef.current = tags;
      setCurrentTags(tags);
      setPackageForm((prev) => {
        cleanupImagePreviews(prev.images);
        return form;
      });
      setDescriptionTab('edit');
      setExpandedVersionKeys(new Set());
    },
    [catalogBaseUrl, setDescriptionTab, setExpandedVersionKeys, setPackageForm],
  );

  const handleStartNewPackage = useCallback(() => {
    setSelectedPackageId('');
    setPackageForm((prev) => {
      cleanupImagePreviews(prev.images);
      return createEmptyPackageForm();
    });
    setInitialTags([]);
    setCurrentTags([]);
    tagListRef.current = [];
    setDescriptionTab('edit');
    setExpandedVersionKeys(new Set());
  }, [setDescriptionTab, setExpandedVersionKeys, setPackageForm]);

  const handlePackageSearchChange = useCallback((value: string) => {
    setPackageSearch(value);
  }, []);

  const applyCatalogJsonPatch = useCallback(
    (jsonText: string) => {
      let parsed: unknown;
      try {
        parsed = JSON.parse(jsonText);
      } catch (e: unknown) {
        throw new Error(`JSON の解析に失敗しました: ${getErrorMessage(e)}`, { cause: e });
      }
      const patchList = extractCatalogPatchList(parsed);
      const patchMap = new Map<string, CatalogPatch>();
      patchList.forEach((patch) => {
        patchMap.set(patch.id, patch);
      });

      const existingIds = new Set(catalogItems.map((item) => item.id));
      const nextCatalogItems: CatalogItem[] = [];
      const changedItems: CatalogItem[] = [];
      for (const item of catalogItems) {
        const patch = patchMap.get(item.id);
        if (!patch) {
          nextCatalogItems.push(item);
          continue;
        }
        const merged = mergeDefinedFields(item, patch);
        const nextItem: CatalogItem = { ...merged, id: item.id };
        nextCatalogItems.push(nextItem);
        if (isDeepEqual(item, nextItem)) continue;
        changedItems.push(nextItem);
      }

      for (const patch of patchMap.values()) {
        if (existingIds.has(patch.id)) continue;
        const nextItem = createCatalogItemFromPatch(patch);
        nextCatalogItems.push(nextItem);
        changedItems.push(nextItem);
        existingIds.add(patch.id);
      }

      return { changedItems, nextCatalogItems };
    },
    [catalogItems],
  );

  return {
    catalogItems,
    setCatalogItems,
    catalogLoadState,
    catalogBaseUrl,
    packageSearch,
    selectedPackageId,
    setSelectedPackageId,
    initialTags,
    currentTags,
    tagCandidates,
    tagListRef,
    filteredPackages,
    applyTagList,
    handleTagsChange,
    handleSelectPackage,
    handleStartNewPackage,
    handlePackageSearchChange,
    applyCatalogJsonPatch,
  };
}
