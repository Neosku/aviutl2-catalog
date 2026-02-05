/**
 * カタログ読込・検索・選択状態を管理する hook
 */
import { useCallback, useDeferredValue, useEffect, useMemo, useRef, useState } from 'react';
import { useCatalog } from '../../../../utils/catalogStore.jsx';
import { createEmptyPackageForm, entryToForm } from '../../model/form';
import { cleanupImagePreviews, commaListToArray, normalizeArrayText, resolveBaseUrl } from '../../model/helpers';
import type { RegisterPackageForm } from '../../model/types';
import type { CatalogItem } from '../types';

interface UseRegisterCatalogStateArgs {
  setPackageForm: React.Dispatch<React.SetStateAction<RegisterPackageForm>>;
  setDescriptionTab: React.Dispatch<React.SetStateAction<string>>;
  setExpandedVersionKeys: React.Dispatch<React.SetStateAction<Set<string>>>;
  setError: React.Dispatch<React.SetStateAction<string>>;
}

export default function useRegisterCatalogState({
  setPackageForm,
  setDescriptionTab,
  setExpandedVersionKeys,
  setError,
}: UseRegisterCatalogStateArgs) {
  const [catalogItems, setCatalogItems] = useState<CatalogItem[]>([]);
  const [catalogLoading, setCatalogLoading] = useState(false);
  const [catalogLoaded, setCatalogLoaded] = useState(false);
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

  const handleTagsChange = useCallback((list: string[]) => {
    const normalized = normalizeArrayText(list);
    tagListRef.current = normalized;
    setCurrentTags(normalized);
  }, []);

  useEffect(() => {
    tagListRef.current = normalizeArrayText(initialTags);
  }, [initialTags]);

  const loadCatalog = useCallback(async () => {
    if (catalogLoaded || catalogLoading) return;
    setCatalogLoading(true);
    try {
      const endpoint = import.meta.env.VITE_REMOTE || './index.json';
      const res = await fetch(endpoint);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();
      const rawList = Array.isArray(json) ? json : Array.isArray((json as any)?.packages) ? (json as any).packages : [];
      const list = (Array.isArray(rawList) ? rawList : []) as CatalogItem[];
      setCatalogItems(list);
      const base = resolveBaseUrl(res.url || endpoint) || '';
      setCatalogBaseUrl(base);
      setCatalogLoaded(true);
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
    } catch (e: any) {
      setError(`index.json の取得に失敗しました: ${e?.message || e}`);
    } finally {
      setCatalogLoading(false);
    }
  }, [catalogLoaded, catalogLoading, setError, setPackageForm]);

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

  return {
    catalogItems,
    setCatalogItems,
    catalogLoading,
    catalogLoaded,
    catalogBaseUrl,
    packageSearch,
    selectedPackageId,
    setSelectedPackageId,
    initialTags,
    currentTags,
    tagCandidates,
    tagListRef,
    filteredPackages,
    handleTagsChange,
    handleSelectPackage,
    handleStartNewPackage,
    handlePackageSearchChange,
  };
}
