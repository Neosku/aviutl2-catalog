import type { CatalogEntryState } from '../../../utils/catalogStore';

export type EligibleItem = CatalogEntryState & {
  niconiCommonsId: string;
};

export interface CopyState {
  ok: boolean;
  count: number;
}

export type SelectedMap = Record<string, boolean>;
