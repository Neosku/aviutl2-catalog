import type { PackageItem } from '../../package/model/types';
import type { HomeContextValue, HomeSortOption, HomeSortOrder } from '../../../layouts/app-shell/types';

export type { HomeContextValue, HomeSortOption, HomeSortOrder };

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
