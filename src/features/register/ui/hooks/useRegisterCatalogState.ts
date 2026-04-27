/**
 * カタログ読込・検索・選択状態を管理する hook
 */
import { useCallback, useDeferredValue, useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useCatalog } from '@/utils/catalogStore';
import { applyCatalogJsonPatch as applyCatalogJsonPatchModel } from '../../model/catalogPatch';
import { buildPackageEntry, createEmptyPackageForm, sourcePackageToForm } from '../../model/form';
import { cleanupImagePreviews, commaListToArray, getErrorMessage, normalizeArrayText } from '../../model/helpers';
import type { RegisterPackageForm } from '../../model/types';
import { catalogEntrySchema, type CatalogEntry } from '@/utils/catalogSchema';
import { loadSourcePackage } from '@/utils/catalogClient';
import type { PackageItem } from '@/utils/catalogStore';

interface UseRegisterCatalogStateArgs {
  setPackageForm: React.Dispatch<React.SetStateAction<RegisterPackageForm>>;
  setDescriptionTab: React.Dispatch<React.SetStateAction<string>>;
  setExpandedVersionKeys: React.Dispatch<React.SetStateAction<Set<string>>>;
  setError: React.Dispatch<React.SetStateAction<string>>;
  onUserEdit?: () => void;
}

function catalogStoreItemToRegisterEntry(item: PackageItem): CatalogEntry {
  return catalogEntrySchema.parse({
    id: item.id,
    name: item.name,
    type: item.typeLabel || item.packageType || item.type || '',
    summary: item.summary || item.description || '',
    description: item.description || item.summary || '',
    author: item.author,
    originalAuthor: item.originalAuthor,
    repoURL: item.repoURL || '',
    'latest-version': item.latestVersion || item['latest-version'] || '',
    popularity: item.popularity ?? 0,
    trend: item.trend ?? 0,
    licenses: item.licenses ?? [],
    niconiCommonsId: item.niconiCommonsId,
    tags: item.tags ?? [],
    dependencies: item.dependencies ?? [],
    images: item.images ?? [],
    installer: item.installer ?? {
      source: { direct: '' },
      install: [],
      uninstall: [],
    },
    version: item.version ?? [],
    deprecation: item.deprecation,
  });
}

function mergeRegisterCatalogItems(
  storeItems: CatalogEntry[],
  currentItems: CatalogEntry[],
  selectedPackageId: string,
): CatalogEntry[] {
  if (!selectedPackageId) {
    return storeItems;
  }
  const currentSelected = currentItems.find((item) => item.id === selectedPackageId);
  if (!currentSelected) {
    return storeItems;
  }
  return storeItems.map((item) =>
    item.id === selectedPackageId
      ? {
          ...currentSelected,
          popularity: item.popularity,
          trend: item.trend,
        }
      : item,
  );
}

export default function useRegisterCatalogState({
  setPackageForm,
  setDescriptionTab,
  setExpandedVersionKeys,
  setError,
  onUserEdit,
}: UseRegisterCatalogStateArgs) {
  const { t, i18n } = useTranslation('register');
  const catalogStore = useCatalog();
  const [catalogItems, setCatalogItems] = useState<CatalogEntry[]>([]);
  const [catalogLoadState, setCatalogLoadState] = useState<'idle' | 'loading' | 'loaded' | 'error'>('idle');
  const [catalogBaseUrl, setCatalogBaseUrl] = useState('');
  const [packageSearch, setPackageSearch] = useState('');
  const deferredPackageSearch = useDeferredValue(packageSearch);
  const [selectedPackageId, setSelectedPackageId] = useState('');
  const sourceLoadSeqRef = useRef(0);
  const selectedPackageIdRef = useRef('');
  const sourceLoadedKeyRef = useRef('');
  const [initialTags, setInitialTags] = useState<string[]>([]);
  const [currentTags, setCurrentTags] = useState<string[]>([]);
  const { allTags } = catalogStore;

  useEffect(() => {
    selectedPackageIdRef.current = selectedPackageId;
  }, [selectedPackageId]);

  const tagCandidates = useMemo(() => {
    const source = Array.isArray(allTags) ? allTags : [];
    const set = new Set<string>(source.map((tag) => String(tag || '')));
    return Array.from(set).toSorted((a, b) => a.localeCompare(b, i18n.language));
  }, [allTags, i18n.language]);

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

  const applyForm = useCallback(
    (form: RegisterPackageForm, packageBasePath = '') => {
      const initialTagList = commaListToArray(form.tagsText);
      setInitialTags(initialTagList);
      setCurrentTags(initialTagList);
      setCatalogBaseUrl(packageBasePath);
      setPackageForm((prev) => {
        cleanupImagePreviews(prev.images);
        return form;
      });
    },
    [setPackageForm],
  );

  const loadSourceForm = useCallback(
    async (item: CatalogEntry, sequence: number) => {
      const requestedLocale = i18n.language;
      const result = await loadSourcePackage({
        packageId: item.id,
        requestedLocale,
      });
      if (sourceLoadSeqRef.current !== sequence) {
        return;
      }
      const form = sourcePackageToForm({
        sourcePackage: result.package,
        packageBasePath: result.packageBasePath,
        descriptionMarkdown: result.markdown.description,
      });
      const nextEntry = catalogEntrySchema.parse(
        buildPackageEntry(form, commaListToArray(form.tagsText), {
          popularity: item.popularity,
          trend: item.trend,
        }),
      );
      setCatalogItems((prev) => prev.map((entry) => (entry.id === nextEntry.id ? nextEntry : entry)));
      sourceLoadedKeyRef.current = `${item.id}:${requestedLocale}`;
      applyForm(form, result.packageBasePath);
    },
    [applyForm, i18n.language],
  );

  const handleSelectPackage = useCallback(
    (item: CatalogEntry | null) => {
      if (!item) {
        sourceLoadSeqRef.current += 1;
        selectedPackageIdRef.current = '';
        sourceLoadedKeyRef.current = '';
        setSelectedPackageId('');
        setInitialTags([]);
        setCatalogBaseUrl('');
        setPackageForm((prev) => {
          cleanupImagePreviews(prev.images);
          return createEmptyPackageForm();
        });
        setDescriptionTab('edit');
        setExpandedVersionKeys(new Set());
        return;
      }
      const packageId = item.id || '';
      selectedPackageIdRef.current = packageId;
      sourceLoadedKeyRef.current = '';
      setSelectedPackageId(packageId);
      setDescriptionTab('edit');
      setExpandedVersionKeys(new Set());
      const sequence = sourceLoadSeqRef.current + 1;
      sourceLoadSeqRef.current = sequence;
      void loadSourceForm(item, sequence).catch((e: unknown) => {
        setError(t('errors.catalogFetch', { detail: getErrorMessage(e) }));
      });
    },
    [loadSourceForm, setDescriptionTab, setError, setExpandedVersionKeys, setPackageForm, t],
  );

  useEffect(() => {
    if (catalogStore.loading) {
      setCatalogLoadState('loading');
      return;
    }
    if (catalogStore.error) {
      setCatalogLoadState('error');
      setError(catalogStore.error);
      return;
    }

    const items = catalogStore.items.map(catalogStoreItemToRegisterEntry);
    const currentSelectedId = selectedPackageIdRef.current;
    setCatalogItems((prev) => mergeRegisterCatalogItems(items, prev, currentSelectedId));
    setCatalogLoadState('loaded');
    if (!items.length) {
      selectedPackageIdRef.current = '';
      sourceLoadedKeyRef.current = '';
      setSelectedPackageId('');
      setCatalogBaseUrl('');
      setPackageForm((prev) => {
        cleanupImagePreviews(prev.images);
        return createEmptyPackageForm();
      });
      return;
    }

    const currentItem = currentSelectedId ? items.find((item) => item.id === currentSelectedId) : undefined;
    if (currentItem) {
      const loadedKey = `${currentSelectedId}:${i18n.language}`;
      if (sourceLoadedKeyRef.current !== loadedKey) {
        const sequence = sourceLoadSeqRef.current + 1;
        sourceLoadSeqRef.current = sequence;
        void loadSourceForm(currentItem, sequence).catch((e: unknown) => {
          setError(t('errors.catalogFetch', { detail: getErrorMessage(e) }));
        });
      }
      return;
    }

    const first = items[0];
    if (first) {
      selectedPackageIdRef.current = first.id;
      sourceLoadedKeyRef.current = '';
      setSelectedPackageId(first.id);
      const sequence = sourceLoadSeqRef.current + 1;
      sourceLoadSeqRef.current = sequence;
      void loadSourceForm(first, sequence).catch((e: unknown) => {
        setError(t('errors.catalogFetch', { detail: getErrorMessage(e) }));
      });
      return;
    }
    selectedPackageIdRef.current = '';
    sourceLoadedKeyRef.current = '';
    setSelectedPackageId('');
  }, [
    catalogStore.error,
    catalogStore.items,
    catalogStore.loading,
    i18n.language,
    loadSourceForm,
    setError,
    setPackageForm,
    t,
  ]);

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

  const handleStartNewPackage = useCallback(() => {
    selectedPackageIdRef.current = '';
    sourceLoadedKeyRef.current = '';
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
