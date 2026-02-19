import { useCallback, useMemo, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { useHomeContext } from '../../../../components/AppShell.jsx';
import { HOME_SORT_OPTIONS } from '../../model/sortOptions';
import type { HomeContextValue, HomeSortOrder } from '../types';

const HOME_CATEGORY_ALL = 'すべて';

function sortTags(tags: string[] | null | undefined): string[] {
  return (tags || []).toSorted((a, b) => a.localeCompare(b, 'ja', { sensitivity: 'base' }));
}

export default function useHomePage() {
  const location = useLocation();
  const {
    filteredPackages,
    searchQuery,
    selectedCategory,
    updateUrl,
    categories,
    allTags,
    selectedTags,
    toggleTag,
    filterInstalled,
    sortOrder,
    setSortOrder,
  } = useHomeContext() as HomeContextValue;

  const [isSortMenuOpen, setIsSortMenuOpen] = useState(false);
  const [isFilterExpanded, setIsFilterExpanded] = useState(false);

  const sortOptions = HOME_SORT_OPTIONS;
  const sortedAllTags = useMemo(() => sortTags(allTags), [allTags]);
  const sortedSelectedTags = useMemo(() => sortTags(selectedTags), [selectedTags]);
  const listSearch = useMemo(() => {
    const params = new URLSearchParams(location.search);
    if (searchQuery) {
      params.set('q', searchQuery);
    } else {
      params.delete('q');
    }
    const next = params.toString();
    return next ? `?${next}` : '';
  }, [location.search, searchQuery]);

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

  const clearConditions = useCallback(() => {
    updateUrl({ q: '', type: '', tags: [], installed: '' });
  }, [updateUrl]);

  return {
    filteredPackages,
    categories,
    selectedCategory,
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
    clearConditions,
  };
}
