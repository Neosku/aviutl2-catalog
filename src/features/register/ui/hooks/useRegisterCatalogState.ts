/**
 * カタログ読込・検索・選択状態を管理する hook
 */
import { useCallback, useDeferredValue, useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useCatalog } from '@/utils/catalogStore';
import { computeLatestVersion, createEmptyPackageForm, sourcePackageToForm } from '../../model/form';
import {
  arrayToCommaList,
  cleanupImagePreviews,
  commaListToArray,
  getErrorMessage,
  normalizeArrayText,
} from '../../model/helpers';
import type { RegisterCatalogItem, RegisterPackageForm } from '../../model/types';
import type { RegisterMarkdownTab } from '../types';
import { loadSourcePackage } from '@/utils/catalogClient';
import type { PackageItem } from '@/utils/catalogStore';
import { computeRegisterRelevantHash } from '../../model/registerTestRequirement';

interface UseRegisterCatalogStateArgs {
  setPackageForm: React.Dispatch<React.SetStateAction<RegisterPackageForm>>;
  setDescriptionTab: React.Dispatch<React.SetStateAction<RegisterMarkdownTab>>;
  setExpandedVersionKeys: React.Dispatch<React.SetStateAction<Set<string>>>;
  setError: React.Dispatch<React.SetStateAction<string>>;
  onUserEdit?: () => void;
}

function catalogStoreItemToRegisterCatalogItem(item: PackageItem): RegisterCatalogItem {
  return {
    id: item.id,
    legacyId: item.legacyId,
    packageType: item.packageType,
    packageRole: item.packageRole,
    name: item.name,
    author: item.author,
    summary: item.summary,
    typeLabel: item.typeLabel,
    tags: item.tags,
    latestVersion: item.latestVersion,
    latestReleaseDate: item.latestReleaseDate,
    popularity: item.popularity,
    trend: item.trend,
    registerRelevantHash: undefined,
    deprecation: item.deprecation,
  };
}

function mergeRegisterCatalogItems(
  storeItems: RegisterCatalogItem[],
  currentItems: RegisterCatalogItem[],
  selectedPackageId: string,
): RegisterCatalogItem[] {
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
  const [catalogItems, setCatalogItems] = useState<RegisterCatalogItem[]>([]);
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
    const set = new Set<string>(allTags.map((tag) => String(tag || '')));
    return Array.from(set).toSorted((a, b) => a.localeCompare(b, i18n.language));
  }, [allTags, i18n.language]);

  const handleTagsChange = useCallback(
    (list: string[]) => {
      onUserEdit?.();
      const normalized = normalizeArrayText(list);
      setCurrentTags(normalized);
      setPackageForm((prev) => ({
        ...prev,
        tagsText: arrayToCommaList(normalized),
      }));
    },
    [onUserEdit, setPackageForm],
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
    async (item: RegisterCatalogItem, sequence: number) => {
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
        changelogMarkdown: result.markdown.changelog,
        noticeMarkdown: result.markdown.notice,
        locale: result.locale,
      });
      const latestReleaseDate = form.versions.at(-1)?.releaseDate ?? '';
      const nextEntry: RegisterCatalogItem = {
        ...item,
        name: form.name,
        author: form.author,
        summary: form.summary,
        typeLabel: form.type,
        tags: commaListToArray(form.tagsText),
        latestVersion: computeLatestVersion(form),
        latestReleaseDate,
        registerRelevantHash: computeRegisterRelevantHash(form),
      };
      setCatalogItems((prev) => prev.map((entry) => (entry.id === nextEntry.id ? nextEntry : entry)));
      sourceLoadedKeyRef.current = `${item.id}:${requestedLocale}`;
      applyForm(form, result.packageBasePath);
    },
    [applyForm, i18n.language],
  );

  const handleSelectPackage = useCallback(
    (item: RegisterCatalogItem | null) => {
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

    const items = catalogStore.items.map(catalogStoreItemToRegisterCatalogItem);
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
    if (!query) return catalogItems;
    return catalogItems.filter((item) => {
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
  };
}
