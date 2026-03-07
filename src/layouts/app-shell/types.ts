import type { PackageItem } from '../../features/package/model/types';

export type HomeSortOrder = 'popularity_desc' | 'trend_desc' | 'added_desc' | 'updated_desc';

export interface HomeSortOption {
  value: HomeSortOrder;
  label: string;
}

export type HomeInstallStatus = 'all' | 'installed' | 'not_installed';
export type SortKey = 'popularity' | 'newest' | 'trend' | 'added';
export type SortDir = 'desc' | 'asc';
export type UrlOverrideValue = string | string[] | null | undefined;

export interface ParsedHomeQuery {
  q: string;
  sortKey: SortKey;
  dir: SortDir;
  type: string;
  tags: string[];
  installStatus: HomeInstallStatus;
}

export type ActivePage = 'home' | 'updates' | 'register' | 'niconi-commons' | 'feedback' | 'settings' | 'package' | '';

export interface AppDirsPayload {
  aviutl2_data?: string;
  [key: string]: unknown;
}

export interface HomeRestoreState {
  restoreSearchFromQuery?: true;
  restoreScroll?: true;
}

export const HOME_SEARCH_RESTORE_STATE: HomeRestoreState = { restoreSearchFromQuery: true };
export const HOME_LIST_RESTORE_STATE: HomeRestoreState = { restoreSearchFromQuery: true, restoreScroll: true };

export interface HomeContextValue {
  filteredPackages: PackageItem[];
  saveHomeScrollPosition: () => void;
  selectedCategory: string;
  clearFilters: () => void;
  isFilterActive: boolean;
  updateAvailableCount: number;
  sortOrder: HomeSortOrder;
  setSortOrder: (order: HomeSortOrder) => void;
  categories: string[];
  allTags: string[];
  selectedTags: string[];
  installStatus: HomeInstallStatus;
  toggleTag: (tag: string) => void;
  updateUrl: (overrides: Record<string, UrlOverrideValue>) => void;
}
