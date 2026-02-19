import type { PackageItem } from '../../features/package/model/types';

export type HomeSortOrder = 'popularity_desc' | 'trend_desc' | 'added_desc' | 'updated_desc';

export interface HomeSortOption {
  value: HomeSortOrder;
  label: string;
}

export type SortKey = 'popularity' | 'newest' | 'trend' | 'added';
export type SortDir = 'desc' | 'asc';
export type UrlOverrideValue = string | string[] | null | undefined;

export interface ParsedHomeQuery {
  q: string;
  sortKey: SortKey;
  dir: SortDir;
  type: string;
  tags: string[];
  installed: boolean;
}

export type ActivePage = 'home' | 'updates' | 'register' | 'niconi-commons' | 'feedback' | 'settings' | 'package' | '';

export interface AppDirsPayload {
  aviutl2_data?: string;
  [key: string]: unknown;
}

export interface HomeContextValue {
  filteredPackages: PackageItem[];
  searchQuery: string;
  selectedCategory: string;
  clearFilters: () => void;
  isFilterActive: boolean;
  updateAvailableCount: number;
  sortOrder: HomeSortOrder;
  setSortOrder: (order: HomeSortOrder) => void;
  categories: string[];
  allTags: string[];
  selectedTags: string[];
  filterInstalled: boolean;
  toggleTag: (tag: string) => void;
  updateUrl: (overrides: Record<string, UrlOverrideValue>) => void;
}
