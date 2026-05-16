import type { CatalogStorePackage } from '@/utils/catalogStore';

export type EligibleItem = CatalogStorePackage & {
  niconiCommonsId: string;
};

export interface CopyState {
  ok: boolean;
  count: number;
}

export type SelectedMap = Record<string, boolean>;

export interface NiconiCommonsExportPackage {
  packageId: string;
  name: string;
  niconiCommonsId: string;
}

export interface NiconiCommonsExportPayload {
  schemaVersion: 1;
  generatedAt: string;
  ids: string[];
  packages: NiconiCommonsExportPackage[];
}
