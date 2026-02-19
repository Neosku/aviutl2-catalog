export const HOME_SORT_OPTIONS = [
  { value: 'popularity_desc', label: '人気順' },
  { value: 'trend_desc', label: 'トレンド順' },
  { value: 'added_desc', label: '新着順' },
  { value: 'updated_desc', label: '最終更新日順' },
] as const;

export type HomeSortOption = (typeof HOME_SORT_OPTIONS)[number];
export type HomeSortOrder = HomeSortOption['value'];
