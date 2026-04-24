import type { InstallableCatalogItem } from '@/utils/catalogInstallItem';
import type { DetectResultMap } from '@/utils/detectResult';
import type { InstallProgressPayload } from '@/utils/installer/types';

export type InitSetupStep = 'intro' | 'installStatus' | 'details' | 'packages' | 'done';

export type InstalledChoice = boolean | null;

export type PickDirKind = 'install' | 'existing';

export interface PackageState {
  downloading: boolean;
  installed: boolean;
  error: string;
  progress: InstallProgressPayload | null;
}

export interface SetupConfig {
  corePackageId: string;
  requiredPluginIds: string[];
}

export interface RequiredPackageRow {
  id: string;
  item: InstallableCatalogItem | null;
  state: PackageState;
}

export type PackageItemsMap = Record<string, InstallableCatalogItem | null>;
export type PackageStatesMap = Record<string, PackageState>;
export type PackageVersionsMap = DetectResultMap;
