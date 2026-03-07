import type { PackageItem } from '../../package/model/types';
import type { HomeContextValue, HomeInstallStatus, HomeSortOrder } from '../../../layouts/app-shell/types';

export type { HomeContextValue, HomeInstallStatus, HomeSortOrder };

export interface FiltersSectionProps {
  categories: string[];
  selectedCategory: string;
  filteredCount: number;
  installStatus: HomeInstallStatus;
  selectedTags: string[];
  sortedSelectedTags: string[];
  sortedAllTags: string[];
  isFilterExpanded: boolean;
  isInstallMenuOpen: boolean;
  isSortMenuOpen: boolean;
  sortOrder: HomeSortOrder;
  onCategoryChange: (category: string) => void;
  onToggleInstallMenu: () => void;
  onCloseInstallMenu: () => void;
  onSelectInstallStatus: (status: HomeInstallStatus) => void;
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
  onBeforeOpenDetail: () => void;
}

export interface EmptyStateSectionProps {
  onClearConditions: () => void;
}
