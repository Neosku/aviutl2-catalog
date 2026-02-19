import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { useLocation, useNavigate } from 'react-router-dom';
import { useCatalog } from '../../../utils/catalogStore.jsx';
import { filterByTagsAndType, getSorter, matchQuery, ORDERED_PACKAGE_TYPES } from '../../../utils/index.js';
import { sortOrderFromQuery, sortParamsFromOrder } from '../constants';
import type {
  ActivePage,
  AppDirsPayload,
  HomeContextValue,
  HomeSortOrder,
  ParsedHomeQuery,
  SortKey,
  UrlOverrideValue,
} from '../types';
import useDebouncedValue from './useDebouncedValue';

function toSortKey(rawSortKey: string | null): SortKey {
  if (rawSortKey === 'newest' || rawSortKey === 'trend' || rawSortKey === 'added' || rawSortKey === 'popularity') {
    return rawSortKey;
  }
  return 'popularity';
}

export default function useAppShellState() {
  const location = useLocation();
  const navigate = useNavigate();
  const { items, allTags } = useCatalog();

  const [error, setError] = useState('');
  const scrollContainerRef = useRef<HTMLDivElement | null>(null);
  const homeScrollRef = useRef(0);
  const [isSidebarCollapsed, setSidebarCollapsed] = useState(false);

  const parseQuery = useMemo<ParsedHomeQuery>(() => {
    const params = new URLSearchParams(location.search);
    const q = params.get('q') || '';
    const sortKey = toSortKey(params.get('sort'));
    const dir = sortKey === 'newest' ? 'desc' : params.get('dir') === 'asc' ? 'asc' : 'desc';
    const type = params.get('type') || '';
    const tags = (params.get('tags') || '').split(',').filter(Boolean);
    const installed = params.get('installed') === '1';
    return { q, sortKey, dir, type, tags, installed };
  }, [location.search]);

  const filterInstalled = parseQuery.installed;
  const selectedCategory = parseQuery.type || 'すべて';
  const selectedTags = parseQuery.tags;
  const sortOrder = sortOrderFromQuery(parseQuery.sortKey);
  const isHome = location.pathname === '/';

  const [searchQuery, setSearchQuery] = useState(parseQuery.q);
  const debouncedQuery = useDebouncedValue(searchQuery, 250);

  const updateUrl = useCallback(
    (overrides: Record<string, UrlOverrideValue>) => {
      const params = new URLSearchParams(location.search);

      Object.entries(overrides).forEach(([key, value]) => {
        if (value === null || value === undefined || value === '') {
          params.delete(key);
          return;
        }
        if (Array.isArray(value)) {
          if (value.length > 0) params.set(key, value.join(','));
          else params.delete(key);
          return;
        }
        params.set(key, String(value));
      });

      if (!('q' in overrides)) {
        if (searchQuery) params.set('q', searchQuery);
        else params.delete('q');
      }

      if (params.get('sort') === 'popularity') params.delete('sort');
      if (params.get('dir') === 'desc' && (!params.get('sort') || params.get('sort') === 'popularity')) {
        params.delete('dir');
      }

      navigate(`${location.pathname}?${params.toString()}`, { replace: true });
    },
    [location.pathname, location.search, navigate, searchQuery],
  );

  useEffect(() => {
    if (!isHome) return;
    if (parseQuery.q !== searchQuery) setSearchQuery(parseQuery.q);
  }, [isHome, parseQuery.q, searchQuery]);

  useEffect(() => {
    const isPackageDetail = location.pathname.startsWith('/package/');
    if (location.pathname !== '/' && !isPackageDetail) setSearchQuery('');
  }, [location.pathname]);

  useEffect(() => {
    if (!isHome) return;
    if (debouncedQuery !== parseQuery.q) {
      updateUrl({ q: debouncedQuery });
    }
  }, [debouncedQuery, isHome, parseQuery.q, updateUrl]);

  useEffect(() => {
    if (!isHome) return;
    const container = scrollContainerRef.current;
    if (!container) return;
    const onScroll = () => {
      homeScrollRef.current = container.scrollTop;
    };
    container.addEventListener('scroll', onScroll, { passive: true });
    return () => container.removeEventListener('scroll', onScroll);
  }, [isHome]);

  useLayoutEffect(() => {
    if (!isHome) return;
    const container = scrollContainerRef.current;
    if (!container) return;
    const previousBehavior = container.style.scrollBehavior;
    container.style.scrollBehavior = 'auto';
    container.scrollTop = homeScrollRef.current || 0;
    container.style.scrollBehavior = previousBehavior;
  }, [isHome]);

  const categories = useMemo(() => ['すべて', ...ORDERED_PACKAGE_TYPES], []);

  const filteredPackages = useMemo(() => {
    const base = searchQuery ? items.filter((item) => matchQuery(item, searchQuery)) : items;
    const category = selectedCategory === 'すべて' ? '' : selectedCategory;
    const filteredByTags = filterByTagsAndType(base, selectedTags, category ? [category] : []);
    const filteredByInstalled = filterInstalled
      ? filteredByTags.filter((item: { installed?: boolean }) => item.installed)
      : filteredByTags;
    const sorter = getSorter(parseQuery.sortKey, parseQuery.dir);
    return filteredByInstalled.toSorted(sorter);
  }, [items, searchQuery, selectedCategory, selectedTags, filterInstalled, parseQuery.sortKey, parseQuery.dir]);

  const isFilterActive = filterInstalled || selectedCategory !== 'すべて' || selectedTags.length > 0;
  const updateAvailableCount = useMemo(() => items.filter((item) => item.installed && !item.isLatest).length, [items]);

  const toggleTag = useCallback(
    (tag: string) => {
      const nextTags = selectedTags.includes(tag)
        ? selectedTags.filter((existing) => existing !== tag)
        : [...selectedTags, tag];
      updateUrl({ tags: nextTags });
    },
    [selectedTags, updateUrl],
  );

  const clearFilters = useCallback(() => {
    setSearchQuery('');
    navigate(location.pathname, { replace: true });
  }, [location.pathname, navigate]);

  const setSortOrder = useCallback(
    (order: HomeSortOrder) => {
      const { sortKey, dir } = sortParamsFromOrder(order);
      updateUrl({ sort: sortKey, dir });
    },
    [updateUrl],
  );

  const openDataDir = useCallback(async () => {
    try {
      const dirs = await invoke<AppDirsPayload>('get_app_dirs');
      const target = dirs && typeof dirs.aviutl2_data === 'string' ? dirs.aviutl2_data.trim() : '';
      if (!target) {
        setError('データフォルダの場所を取得できませんでした。設定画面で AviUtl2 のフォルダを確認してください。');
        return;
      }
      const shell = await import('@tauri-apps/plugin-shell');
      if (shell?.Command?.create) {
        const command = shell.Command.create('explorer', [target]);
        await command.execute();
        return;
      }
      setError('エクスプローラーを起動できませんでした。');
    } catch {
      setError('データフォルダを開けませんでした。設定を確認してください。');
    }
  }, []);

  const launchAviUtl2 = useCallback(async () => {
    try {
      await invoke('launch_aviutl2');
    } catch (launchError) {
      setError(typeof launchError === 'string' ? launchError : 'AviUtl2 の起動に失敗しました。');
    }
  }, []);

  const goHome = useCallback(() => navigate('/'), [navigate]);
  const goUpdates = useCallback(() => navigate('/updates'), [navigate]);
  const goRegister = useCallback(() => navigate('/register'), [navigate]);
  const goNiconiCommons = useCallback(() => navigate('/niconi-commons'), [navigate]);
  const goFeedback = useCallback(() => navigate('/feedback'), [navigate]);
  const goSettings = useCallback(() => navigate('/settings'), [navigate]);
  const toggleSidebar = useCallback(() => setSidebarCollapsed((prev) => !prev), []);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes(document.activeElement?.tagName || '')) return;
      if (!event.altKey) return;
      switch (event.code) {
        case 'KeyP':
          event.preventDefault();
          goHome();
          break;
        case 'KeyU':
          event.preventDefault();
          goUpdates();
          break;
        case 'KeyR':
          event.preventDefault();
          goRegister();
          break;
        case 'KeyF':
          event.preventDefault();
          goFeedback();
          break;
        case 'KeyO':
          event.preventDefault();
          void openDataDir();
          break;
        case 'KeyL':
          event.preventDefault();
          void launchAviUtl2();
          break;
        case 'KeyS':
          event.preventDefault();
          goSettings();
          break;
        case 'KeyB':
          event.preventDefault();
          setSidebarCollapsed((prev) => !prev);
          break;
        default:
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [goFeedback, goHome, goRegister, goSettings, goUpdates, launchAviUtl2, openDataDir]);

  const activePage = useMemo<ActivePage>(() => {
    const path = location.pathname;
    if (path === '/') return 'home';
    if (path.startsWith('/updates')) return 'updates';
    if (path.startsWith('/register')) return 'register';
    if (path.startsWith('/niconi-commons')) return 'niconi-commons';
    if (path.startsWith('/feedback')) return 'feedback';
    if (path.startsWith('/settings')) return 'settings';
    if (path.startsWith('/package')) return 'package';
    return '';
  }, [location.pathname]);

  const outletContext = useMemo<HomeContextValue>(
    () => ({
      filteredPackages,
      searchQuery,
      selectedCategory,
      clearFilters,
      isFilterActive,
      updateAvailableCount,
      sortOrder,
      setSortOrder,
      categories,
      allTags: allTags || [],
      selectedTags,
      filterInstalled,
      toggleTag,
      updateUrl,
    }),
    [
      allTags,
      categories,
      clearFilters,
      filterInstalled,
      filteredPackages,
      isFilterActive,
      searchQuery,
      selectedCategory,
      selectedTags,
      setSortOrder,
      sortOrder,
      toggleTag,
      updateAvailableCount,
      updateUrl,
    ],
  );

  return {
    error,
    setError,
    isSidebarCollapsed,
    activePage,
    isHome,
    searchQuery,
    setSearchQuery,
    scrollContainerRef,
    outletContext,
    updateAvailableCount,
    goHome,
    goUpdates,
    goRegister,
    goNiconiCommons,
    goFeedback,
    goSettings,
    openDataDir,
    launchAviUtl2,
    toggleSidebar,
  };
}
