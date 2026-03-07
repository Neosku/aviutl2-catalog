import { useCallback, useMemo, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { useHomeContext } from '../../../../layouts/app-shell/AppShell';
import { installStatusToQueryValue } from '../../../../layouts/app-shell/constants';
import type { HomeInstallStatus, HomeSortOrder } from '../types';

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
    installStatus,
    sortOrder,
    setSortOrder,
  } = useHomeContext();

  const [isInstallMenuOpen, setIsInstallMenuOpen] = useState(false);
  const [isSortMenuOpen, setIsSortMenuOpen] = useState(false);
  const [isFilterExpanded, setIsFilterExpanded] = useState(false);

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

  const toggleInstallMenu = useCallback(() => {
    setIsInstallMenuOpen((prev) => !prev);
  }, []);

  const closeInstallMenu = useCallback(() => {
    setIsInstallMenuOpen(false);
  }, []);

  const selectInstallStatus = useCallback(
    (status: HomeInstallStatus) => {
      updateUrl({ installed: installStatusToQueryValue(status) });
      setIsInstallMenuOpen(false);
    },
    [updateUrl],
  );

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
    installStatus,
    selectedTags,
    sortedSelectedTags,
    sortedAllTags,
    listSearch,
    isInstallMenuOpen,
    isSortMenuOpen,
    isFilterExpanded,
    sortOrder,
    setCategory,
    toggleInstallMenu,
    closeInstallMenu,
    selectInstallStatus,
    toggleFilterExpanded,
    toggleSortMenu,
    closeSortMenu,
    selectSortOrder,
    toggleTag,
    clearTags,
    clearConditions: clearFilters,
  };
}
