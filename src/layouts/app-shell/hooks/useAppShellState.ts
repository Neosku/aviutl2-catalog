import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import * as tauriShell from '@tauri-apps/plugin-shell';
import { useTranslation } from 'react-i18next';
import { useLocation, useNavigate } from 'react-router-dom';
import { useCatalog } from '@/utils/catalogStore';
import { ipc } from '@/utils/invokeIpc';
import usePausedPackageUpdates from '@/utils/usePausedPackageUpdates';
import {
  filterByTagsAndType,
  getSorter,
  matchQuery,
  ORDERED_PACKAGE_TYPE_KEYS,
  packageTypeKeyFromQueryValue,
} from '@/utils/query';
import {
  deprecationStatusFromQueryValue,
  installStatusFromQueryValue,
  sortOrderFromQuery,
  sortParamsFromOrder,
} from '../constants';
import {
  createSidebarRouteActionHandlers,
  resolveAppShellActivePage,
  SIDEBAR_SHORTCUTS,
  type SidebarActionHandlers,
} from '../sidebarConfig';
import type {
  ActivePage,
  HomeContextValue,
  HomeRestoreState,
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

function readStoredHomeSortOrder(search: string): HomeSortOrder | null {
  if (new URLSearchParams(search).has('sort')) return null;

  const value = window.localStorage.getItem('home-sort-order');
  if (value === 'trend_desc' || value === 'added_desc' || value === 'updated_desc') {
    return value;
  }
  return null;
}

function readHomeRestoreState(value: unknown): HomeRestoreState | null {
  if (!value || typeof value !== 'object') return null;
  const restoreSearchFromQuery = (value as { restoreSearchFromQuery?: unknown }).restoreSearchFromQuery === true;
  const restoreScroll = (value as { restoreScroll?: unknown }).restoreScroll === true;
  if (!restoreSearchFromQuery && !restoreScroll) return null;
  return {
    restoreSearchFromQuery: restoreSearchFromQuery ? true : undefined,
    restoreScroll: restoreScroll ? true : undefined,
  };
}

export default function useAppShellState() {
  const { t } = useTranslation('home');
  const location = useLocation();
  const navigate = useNavigate();
  const { items, allTags } = useCatalog();

  const [error, setError] = useState('');
  const scrollContainerRef = useRef<HTMLDivElement | null>(null);
  const homeScrollRef = useRef(0);
  const pendingDraftSearchSyncRef = useRef<string | null>(null);
  const handledSearchSyncLocationKeyRef = useRef<string | null>(null);
  const previousIsHomeRef = useRef(false);
  const [isSidebarCollapsed, setSidebarCollapsed] = useState(false);
  const { isLoaded: pausedPackageUpdatesLoaded, pausedPackageIdSet } = usePausedPackageUpdates();
  const isHome = location.pathname === '/';
  const storedHomeSortOrder = useMemo(
    () => (isHome ? readStoredHomeSortOrder(location.search) : null),
    [isHome, location.search],
  );

  const parseQuery = useMemo<ParsedHomeQuery>(() => {
    const params = new URLSearchParams(location.search);
    const initialSortKey = storedHomeSortOrder ? sortParamsFromOrder(storedHomeSortOrder).sortKey : null;
    const q = params.get('q') || '';
    const sortKey = initialSortKey ?? toSortKey(params.get('sort'));
    const dir = initialSortKey ? 'desc' : sortKey === 'newest' ? 'desc' : params.get('dir') === 'asc' ? 'asc' : 'desc';
    const type = packageTypeKeyFromQueryValue(params.get('type'));
    const tags = (params.get('tags') || '').split(',').filter(Boolean);
    const installStatus = installStatusFromQueryValue(params.get('installed'));
    const deprecationStatus = deprecationStatusFromQueryValue(params.get('deprecated'));
    return { q, sortKey, dir, type, tags, installStatus, deprecationStatus };
  }, [location.search]);

  const installStatus = parseQuery.installStatus;
  const deprecationStatus = parseQuery.deprecationStatus;
  const selectedCategory = parseQuery.type;
  const selectedTags = parseQuery.tags;
  const sortOrder = sortOrderFromQuery(parseQuery.sortKey);
  const homeRestoreState = useMemo(
    () => (isHome ? readHomeRestoreState(location.state) : null),
    [isHome, location.state],
  );

  const [draftSearchQuery, setDraftSearchQuery] = useState(parseQuery.q);
  const debouncedDraftSearchQuery = useDebouncedValue(draftSearchQuery, 50);
  const shouldSyncSearchFromQuery =
    homeRestoreState?.restoreSearchFromQuery === true && handledSearchSyncLocationKeyRef.current !== location.key;

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
        const currentQuery = isHome ? draftSearchQuery : parseQuery.q;
        if (currentQuery) params.set('q', currentQuery);
        else params.delete('q');
      }

      if (params.get('sort') === 'popularity') params.delete('sort');
      if (params.get('dir') === 'desc' && (!params.get('sort') || params.get('sort') === 'popularity')) {
        params.delete('dir');
      }

      navigate(`${location.pathname}?${params.toString()}`, { replace: true });
    },
    [draftSearchQuery, isHome, location.pathname, location.search, navigate, parseQuery.q],
  );

  const saveHomeScrollPosition = useCallback(() => {
    const container = scrollContainerRef.current;
    if (!container) return;
    homeScrollRef.current = container.scrollTop;
  }, []);

  const setSearchInput = useCallback((next: string) => {
    setDraftSearchQuery(next);
  }, []);

  useLayoutEffect(() => {
    if (!shouldSyncSearchFromQuery) return;
    pendingDraftSearchSyncRef.current = parseQuery.q;
    handledSearchSyncLocationKeyRef.current = location.key;
    setDraftSearchQuery(parseQuery.q);
  }, [location.key, parseQuery.q, shouldSyncSearchFromQuery]);

  useEffect(() => {
    if (!isHome) {
      pendingDraftSearchSyncRef.current = null;
      return;
    }
    const pending = pendingDraftSearchSyncRef.current;
    if (pending !== null) {
      if (debouncedDraftSearchQuery === pending) {
        pendingDraftSearchSyncRef.current = null;
      }
      return;
    }
    if (debouncedDraftSearchQuery !== parseQuery.q) {
      updateUrl({ q: debouncedDraftSearchQuery });
    }
  }, [debouncedDraftSearchQuery, isHome, parseQuery.q, updateUrl]);

  useLayoutEffect(() => {
    if (!isHome) {
      previousIsHomeRef.current = false;
      return;
    }
    const container = scrollContainerRef.current;
    if (!container) return;
    const enteredHome = !previousIsHomeRef.current;
    if (!enteredHome) return;
    const previousBehavior = container.style.scrollBehavior;
    container.style.scrollBehavior = 'auto';
    const nextScrollTop = homeRestoreState?.restoreScroll ? homeScrollRef.current || 0 : 0;
    container.scrollTop = nextScrollTop;
    container.style.scrollBehavior = previousBehavior;
    previousIsHomeRef.current = true;
    const frameId = window.requestAnimationFrame(() => {
      const currentContainer = scrollContainerRef.current;
      if (!currentContainer || location.pathname !== '/') return;
      const currentBehavior = currentContainer.style.scrollBehavior;
      currentContainer.style.scrollBehavior = 'auto';
      currentContainer.scrollTop = nextScrollTop;
      currentContainer.style.scrollBehavior = currentBehavior;
    });
    return () => window.cancelAnimationFrame(frameId);
  }, [homeRestoreState?.restoreScroll, isHome, location.pathname]);

  useLayoutEffect(() => {
    if (!storedHomeSortOrder) return;
    const { sortKey, dir } = sortParamsFromOrder(storedHomeSortOrder);
    updateUrl({ sort: sortKey, dir });
  }, [storedHomeSortOrder, updateUrl]);

  const categories = ORDERED_PACKAGE_TYPE_KEYS;

  const filteredPackages = useMemo(() => {
    const base = parseQuery.q ? items.filter((item) => matchQuery(item, parseQuery.q)) : items;
    const category = selectedCategory === 'all' ? '' : selectedCategory;
    const filteredByTags = filterByTagsAndType(base, selectedTags, category ? [category] : []);
    const filteredByInstalled =
      installStatus === 'installed'
        ? filteredByTags.filter((item: { installed?: boolean }) => item.installed)
        : installStatus === 'not_installed'
          ? filteredByTags.filter((item: { installed?: boolean }) => !item.installed)
          : filteredByTags;
    const filteredByDeprecation =
      deprecationStatus === 'deprecated'
        ? filteredByInstalled.filter((item: { deprecation?: unknown }) => Boolean(item.deprecation))
        : deprecationStatus === 'active'
          ? filteredByInstalled.filter((item: { deprecation?: unknown }) => !item.deprecation)
          : filteredByInstalled;
    const sorter = getSorter(parseQuery.sortKey, parseQuery.dir);
    return filteredByDeprecation.toSorted(sorter);
  }, [
    deprecationStatus,
    installStatus,
    items,
    parseQuery.dir,
    parseQuery.q,
    parseQuery.sortKey,
    selectedCategory,
    selectedTags,
  ]);

  const isFilterActive =
    installStatus !== 'all' || deprecationStatus !== 'active' || selectedCategory !== 'all' || selectedTags.length > 0;
  const updateAvailableCount = useMemo(
    () =>
      pausedPackageUpdatesLoaded
        ? items.filter((item) => item.installed && !item.isLatest && !pausedPackageIdSet.has(item.id)).length
        : 0,
    [items, pausedPackageIdSet, pausedPackageUpdatesLoaded],
  );

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
    pendingDraftSearchSyncRef.current = '';
    setDraftSearchQuery('');
    updateUrl({ q: '', type: '', tags: [], installed: '', deprecated: '' });
  }, [updateUrl]);

  const setSortOrder = useCallback(
    (order: HomeSortOrder) => {
      if (order === 'popularity_desc') window.localStorage.removeItem('home-sort-order');
      else window.localStorage.setItem('home-sort-order', order);
      const { sortKey, dir } = sortParamsFromOrder(order);
      updateUrl({ sort: sortKey, dir });
    },
    [updateUrl],
  );

  const openDataDir = useCallback(async () => {
    try {
      const dirs = await ipc.getAppDirs();
      const target = dirs && typeof dirs.aviutl2_data === 'string' ? dirs.aviutl2_data.trim() : '';
      if (!target) {
        setError(t('errors.dataDirUnavailable'));
        return;
      }
      const command = tauriShell.Command.create('explorer', [target]);
      await command.execute();
      return;
    } catch {
      setError(t('errors.dataDirOpenFailed'));
    }
  }, [t]);

  const launchAviUtl2 = useCallback(async () => {
    try {
      await ipc.launchAviutl2();
    } catch (launchError) {
      setError(typeof launchError === 'string' ? launchError : t('errors.launchFailed'));
    }
  }, [t]);

  const toggleSidebar = useCallback(() => setSidebarCollapsed((prev) => !prev), []);
  const routeActionHandlers = useMemo(() => createSidebarRouteActionHandlers(navigate), [navigate]);
  const sidebarActionHandlers = useMemo<SidebarActionHandlers>(
    () => ({
      ...routeActionHandlers,
      'launch-aviutl2': launchAviUtl2,
      'open-data-dir': openDataDir,
      'toggle-sidebar': toggleSidebar,
    }),
    [launchAviUtl2, openDataDir, routeActionHandlers, toggleSidebar],
  );

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes(document.activeElement?.tagName || '')) return;
      if (!event.altKey) return;
      const shortcutMatch = SIDEBAR_SHORTCUTS.find(({ shortcut }) => shortcut.code === event.code);
      if (!shortcutMatch) return;

      event.preventDefault();
      void sidebarActionHandlers[shortcutMatch.id]();
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [sidebarActionHandlers]);

  const activePage = useMemo<ActivePage>(() => resolveAppShellActivePage(location.pathname), [location.pathname]);

  const outletContext = useMemo<HomeContextValue>(
    () => ({
      filteredPackages,
      scrollContainerRef,
      saveHomeScrollPosition,
      searchQuery: draftSearchQuery,
      setSearchQuery: setSearchInput,
      selectedCategory,
      clearFilters,
      isFilterActive,
      pausedPackageUpdatesLoaded,
      pausedPackageUpdateIdSet: pausedPackageIdSet,
      updateAvailableCount,
      sortOrder,
      setSortOrder,
      categories,
      allTags,
      selectedTags,
      installStatus,
      deprecationStatus,
      toggleTag,
      updateUrl,
    }),
    [
      allTags,
      categories,
      clearFilters,
      deprecationStatus,
      installStatus,
      filteredPackages,
      isFilterActive,
      pausedPackageUpdatesLoaded,
      pausedPackageIdSet,
      saveHomeScrollPosition,
      scrollContainerRef,
      setSearchInput,
      selectedCategory,
      selectedTags,
      draftSearchQuery,
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
    scrollContainerRef,
    outletContext,
    updateAvailableCount,
    sidebarActionHandlers,
  };
}
