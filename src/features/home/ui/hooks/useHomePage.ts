import { useCallback, useMemo, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { useHomeContext } from '../../../../layouts/app-shell/AppShell';
import { SORT_OPTIONS } from '../../../../layouts/app-shell/constants';
import type { HomeSortOrder } from '../types';

const HOME_CATEGORY_ALL = 'すべて';

function sortTags(tags: string[] | null | undefined): string[] {
  return (tags || []).toSorted((a, b) => a.localeCompare(b, 'ja', { sensitivity: 'base' }));
}

export default function useHomePage() {
  const location = useLocation();
  const {
    filteredPackages,
    clearFilters,
    saveHomeScrollPosition,
    selectedCategory,
    updateUrl,
    categories,
    allTags,
    selectedTags,
    toggleTag,
    filterInstalled,
    sortOrder,
    setSortOrder,
  } = useHomeContext();

  const [isSortMenuOpen, setIsSortMenuOpen] = useState(false);
  const [isFilterExpanded, setIsFilterExpanded] = useState(false);

  const sortOptions = SORT_OPTIONS;
  const sortedAllTags = useMemo(() => sortTags(allTags), [allTags]);
  const sortedSelectedTags = useMemo(() => sortTags(selectedTags), [selectedTags]);
  const listSearch = useMemo(() => {
    const params = new URLSearchParams(location.search);
    const next = params.toString();
    return next ? `?${next}` : '';
  }, [location.search]);

  const setCategory = useCallback(
    (category: string) => {
      updateUrl({ type: category === HOME_CATEGORY_ALL ? '' : category });
    },
    [updateUrl],
  );

  const toggleInstalledFilter = useCallback(() => {
    updateUrl({ installed: filterInstalled ? '' : '1' });
  }, [filterInstalled, updateUrl]);

  const toggleFilterExpanded = useCallback(() => {
    setIsFilterExpanded((prev) => !prev);
  }, []);

  const toggleSortMenu = useCallback(() => {
    setIsSortMenuOpen((prev) => !prev);
  }, []);

  const closeSortMenu = useCallback(() => {
    setIsSortMenuOpen(false);
  }, []);

  const selectSortOrder = useCallback(
    (order: HomeSortOrder) => {
      setSortOrder(order);
      setIsSortMenuOpen(false);
    },
    [setSortOrder],
  );

  const clearTags = useCallback(() => {
    updateUrl({ tags: [] });
  }, [updateUrl]);

  return {
    filteredPackages,
    categories,
    selectedCategory,
    saveHomeScrollPosition,
    filterInstalled,
    selectedTags,
    sortedSelectedTags,
    sortedAllTags,
    listSearch,
    isSortMenuOpen,
    isFilterExpanded,
    sortOrder,
    sortOptions,
    setCategory,
    toggleInstalledFilter,
    toggleFilterExpanded,
    toggleSortMenu,
    closeSortMenu,
    selectSortOrder,
    toggleTag,
    clearTags,
    clearConditions: clearFilters,
  };
}
