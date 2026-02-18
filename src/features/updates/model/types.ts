import type { CatalogEntryState } from '../../../utils/catalogStore.jsx';

export type UpdatesItem = CatalogEntryState;

export interface ItemUpdateProgress {
  ratio: number;
  label: string;
}

export type ItemUpdateProgressMap = Record<string, ItemUpdateProgress>;

export interface BulkUpdateProgress {
  ratio: number;
  itemName?: string;
  status?: string;
  current: number;
  total: number;
}

export interface InstallerProgressPayload {
  ratio?: number;
  label?: string;
}
