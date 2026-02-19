import type { CatalogEntryState } from '../../../utils/catalogStore.jsx';

export type EligibleItem = CatalogEntryState & {
  niconiCommonsId: string;
};

export interface CopyState {
  ok: boolean;
  count: number;
}

export type SelectedMap = Record<string, boolean>;
