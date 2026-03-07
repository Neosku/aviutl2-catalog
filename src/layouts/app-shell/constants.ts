import type { HomeInstallStatus, HomeSortOption, HomeSortOrder, SortDir, SortKey } from './types';

function toLabelRecord<T extends string>(options: readonly { value: T; label: string }[]): Record<T, string> {
  return Object.fromEntries(options.map((option) => [option.value, option.label])) as Record<T, string>;
}

export const SORT_OPTIONS: readonly HomeSortOption[] = [
  { value: 'popularity_desc', label: '人気順' },
  { value: 'trend_desc', label: 'トレンド順' },
  { value: 'added_desc', label: '新着順' },
  { value: 'updated_desc', label: '最終更新日順' },
];
export const INSTALL_STATUS_OPTIONS: readonly { value: HomeInstallStatus; label: string }[] = [
  { value: 'all', label: 'すべて' },
  { value: 'installed', label: 'インストール済み' },
  { value: 'not_installed', label: '未インストール' },
];
export const SORT_OPTION_LABELS = toLabelRecord<HomeSortOrder>(SORT_OPTIONS);
export const INSTALL_STATUS_LABELS = toLabelRecord<HomeInstallStatus>(INSTALL_STATUS_OPTIONS);
const INSTALL_STATUS_QUERY_VALUES: Record<HomeInstallStatus, string> = {
  all: '',
  installed: '1',
  not_installed: '0',
};

export function sortOrderFromQuery(sortKey: string): HomeSortOrder {
  if (sortKey === 'popularity') return 'popularity_desc';
  if (sortKey === 'trend') return 'trend_desc';
  if (sortKey === 'added') return 'added_desc';
  if (sortKey === 'newest') return 'updated_desc';
  return 'popularity_desc';
}

export function installStatusFromQueryValue(value: string | null): HomeInstallStatus {
  if (value === '1') return 'installed';
  if (value === '0') return 'not_installed';
  return 'all';
}

export function installStatusToQueryValue(status: HomeInstallStatus): string {
  return INSTALL_STATUS_QUERY_VALUES[status];
}

export function sortParamsFromOrder(order: HomeSortOrder): { sortKey: SortKey; dir: SortDir } {
  switch (order) {
    case 'popularity_desc':
      return { sortKey: 'popularity', dir: 'desc' };
    case 'trend_desc':
      return { sortKey: 'trend', dir: 'desc' };
    case 'added_desc':
      return { sortKey: 'added', dir: 'desc' };
    case 'updated_desc':
    default:
      return { sortKey: 'newest', dir: 'desc' };
  }
}
