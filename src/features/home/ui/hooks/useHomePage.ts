import { useCallback, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useLocation } from 'react-router-dom';
import { useHomeContext } from '@/layouts/app-shell/AppShell';
import { deprecationStatusToQueryValue, installStatusToQueryValue } from '@/layouts/app-shell/constants';
import type { PackageTypeFilterKey } from '@/utils/query';
import type { HomeDeprecationStatus, HomeInstallStatus, HomeSortOrder } from '../types';

const HOME_CATEGORY_ALL: PackageTypeFilterKey = 'all';

function sortTags(tags: string[], locale: string): string[] {
  return tags.toSorted((a, b) => a.localeCompare(b, locale, { sensitivity: 'base' }));
}

export default function useHomePage() {
  const { i18n } = useTranslation();
  const location = useLocation();
  const {
    filteredPackages,
    scrollContainerRef,
    clearFilters,
    saveHomeScrollPosition,
    searchQuery,
    setSearchQuery,
    selectedCategory,
    updateUrl,
    categories,
    allTags,
    selectedTags,
    pausedPackageUpdatesLoaded,
    pausedPackageUpdateIdSet,
    toggleTag,
    installStatus,
    deprecationStatus,
    sortOrder,
    setSortOrder,
  } = useHomeContext();

  const [isInstallMenuOpen, setIsInstallMenuOpen] = useState(false);
  const [isDeprecationMenuOpen, setIsDeprecationMenuOpen] = useState(false);
  const [isSortMenuOpen, setIsSortMenuOpen] = useState(false);
  const [isFilterExpanded, setIsFilterExpanded] = useState(false);

  const sortedAllTags = useMemo(() => sortTags(allTags, i18n.language), [allTags, i18n.language]);
  const sortedSelectedTags = useMemo(() => sortTags(selectedTags, i18n.language), [i18n.language, selectedTags]);
  const listSearch = useMemo(() => {
    const params = new URLSearchParams(location.search);
    const next = params.toString();
    return next ? `?${next}` : '';
  }, [location.search]);

  const setCategory = useCallback(
    (category: PackageTypeFilterKey) => {
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

  const toggleDeprecationMenu = useCallback(() => {
    setIsDeprecationMenuOpen((prev) => !prev);
  }, []);

  const closeDeprecationMenu = useCallback(() => {
    setIsDeprecationMenuOpen(false);
  }, []);

  const selectDeprecationStatus = useCallback(
    (status: HomeDeprecationStatus) => {
      updateUrl({ deprecated: deprecationStatusToQueryValue(status) });
      setIsDeprecationMenuOpen(false);
    },
    [updateUrl],
  );

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
    scrollContainerRef,
    categories,
    searchQuery,
    setSearchQuery,
    selectedCategory,
    pausedPackageUpdatesLoaded,
    pausedPackageUpdateIdSet,
    saveHomeScrollPosition,
    installStatus,
    deprecationStatus,
    selectedTags,
    sortedSelectedTags,
    sortedAllTags,
    listSearch,
    isInstallMenuOpen,
    isDeprecationMenuOpen,
    isSortMenuOpen,
    isFilterExpanded,
    sortOrder,
    setCategory,
    toggleInstallMenu,
    closeInstallMenu,
    selectInstallStatus,
    toggleDeprecationMenu,
    closeDeprecationMenu,
    selectDeprecationStatus,
    toggleFilterExpanded,
    toggleSortMenu,
    closeSortMenu,
    selectSortOrder,
    toggleTag,
    clearTags,
    clearConditions: clearFilters,
  };
}
