/**
 * カタログ読込・検索・選択状態を管理する hook
 */
import { useCallback, useDeferredValue, useEffect, useMemo, useState } from 'react';
import { useCatalog } from '../../../../utils/catalogStore';
import { applyCatalogJsonPatch as applyCatalogJsonPatchModel } from '../../model/catalogPatch';
import { createEmptyPackageForm, entryToForm } from '../../model/form';
import {
  cleanupImagePreviews,
  commaListToArray,
  getErrorMessage,
  normalizeArrayText,
  resolveBaseUrl,
} from '../../model/helpers';
import type { RegisterPackageForm } from '../../model/types';
import { catalogIndexSchema, type CatalogEntry } from '../../../../utils/catalogSchema';

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function extractCatalogArray(json: unknown): unknown[] | null {
  if (Array.isArray(json)) return json;
  if (!isPlainObject(json)) return null;
  return Array.isArray(json.packages) ? json.packages : null;
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
  const [catalogItems, setCatalogItems] = useState<CatalogEntry[]>([]);
  const [catalogLoadState, setCatalogLoadState] = useState<'idle' | 'loading' | 'loaded' | 'error'>('idle');
  const [catalogBaseUrl, setCatalogBaseUrl] = useState('');
  const [packageSearch, setPackageSearch] = useState('');
  const deferredPackageSearch = useDeferredValue(packageSearch);
  const [selectedPackageId, setSelectedPackageId] = useState('');
  const [initialTags, setInitialTags] = useState<string[]>([]);
  const [currentTags, setCurrentTags] = useState<string[]>([]);
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
      setCurrentTags(normalized);
    },
    [onUserEdit],
  );

  const applyTagList = useCallback((list: string[]) => {
    const normalized = normalizeArrayText(list);
    setInitialTags(normalized);
    setCurrentTags(normalized);
  }, []);

  const loadCatalog = useCallback(async () => {
    if (catalogLoadState !== 'idle') return;
    setCatalogLoadState('loading');
    try {
      const endpoint = import.meta.env.VITE_REMOTE || './index.json';
      const res = await fetch(endpoint);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();
      const rawList = extractCatalogArray(json);
      if (!Array.isArray(rawList)) {
        throw new Error('index.json の形式が不正です。');
      }
      const list = catalogIndexSchema.parse(rawList);
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
    (item: CatalogEntry | null) => {
      if (!item) {
        setSelectedPackageId('');
        setInitialTags([]);
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
    setDescriptionTab('edit');
    setExpandedVersionKeys(new Set());
  }, [setDescriptionTab, setExpandedVersionKeys, setPackageForm]);

  const handlePackageSearchChange = useCallback((value: string) => {
    setPackageSearch(value);
  }, []);

  const applyCatalogJsonPatch = useCallback(
    (jsonText: string) => applyCatalogJsonPatchModel({ catalogItems, jsonText }),
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
    filteredPackages,
    applyTagList,
    handleTagsChange,
    handleSelectPackage,
    handleStartNewPackage,
    handlePackageSearchChange,
    applyCatalogJsonPatch,
  };
}
