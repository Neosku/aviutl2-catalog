import type { CatalogStorePackage } from '@/utils/catalogStore';

export type EligibleItem = CatalogStorePackage & {
  niconiCommonsId: string;
};

export interface CopyState {
  ok: boolean;
  count: number;
}

export type SelectedMap = Record<string, boolean>;
