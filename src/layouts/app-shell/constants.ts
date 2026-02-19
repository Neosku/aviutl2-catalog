import type { HomeSortOption, HomeSortOrder, SortDir, SortKey } from './types';

export const SORT_OPTIONS: readonly HomeSortOption[] = [
  { value: 'popularity_desc', label: '人気順' },
  { value: 'trend_desc', label: 'トレンド順' },
  { value: 'added_desc', label: '新着順' },
  { value: 'updated_desc', label: '最終更新日順' },
];

export function sortOrderFromQuery(sortKey: string): HomeSortOrder {
  if (sortKey === 'popularity') return 'popularity_desc';
  if (sortKey === 'trend') return 'trend_desc';
  if (sortKey === 'added') return 'added_desc';
  if (sortKey === 'newest') return 'updated_desc';
  return 'popularity_desc';
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
