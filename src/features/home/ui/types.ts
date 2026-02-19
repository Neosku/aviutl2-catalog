import type { PackageItem } from '../../package/model/types';
import type { HomeSortOption, HomeSortOrder } from '../model/sortOptions';

export type { HomeSortOption, HomeSortOrder };

type UrlOverrideValue = string | string[] | null | undefined;

export interface HomeContextValue {
  filteredPackages: PackageItem[];
  searchQuery: string;
  selectedCategory: string;
  updateUrl: (overrides: Record<string, UrlOverrideValue>) => void;
  categories: string[];
  allTags: string[];
  selectedTags: string[];
  toggleTag: (tag: string) => void;
  filterInstalled: boolean;
  sortOrder: HomeSortOrder;
  setSortOrder: (order: HomeSortOrder) => void;
}

export interface FiltersSectionProps {
  categories: string[];
  selectedCategory: string;
  filteredCount: number;
  filterInstalled: boolean;
  selectedTags: string[];
  sortedSelectedTags: string[];
  sortedAllTags: string[];
  isFilterExpanded: boolean;
  isSortMenuOpen: boolean;
  sortOrder: HomeSortOrder;
  sortOptions: readonly HomeSortOption[];
  onCategoryChange: (category: string) => void;
  onToggleInstalled: () => void;
  onToggleFilterExpanded: () => void;
  onToggleSortMenu: () => void;
  onCloseSortMenu: () => void;
  onSelectSortOrder: (order: HomeSortOrder) => void;
  onToggleTag: (tag: string) => void;
  onClearTags: () => void;
}

export interface PackageGridSectionProps {
  filteredPackages: PackageItem[];
  listSearch: string;
}

export interface EmptyStateSectionProps {
  onClearConditions: () => void;
}
