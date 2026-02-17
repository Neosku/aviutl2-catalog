export type InitSetupStep = 'intro' | 'installStatus' | 'details' | 'packages' | 'done';

export type InstalledChoice = boolean | null;

export type PickDirKind = 'install' | 'existing';

export interface InstallProgress {
  ratio?: number;
  percent?: number;
  label?: string;
  phase?: string;
  step?: string | null;
  stepIndex?: number | null;
  totalSteps?: number | null;
  [key: string]: unknown;
}

export interface CatalogItem {
  id: string;
  name?: string;
  summary?: string;
  [key: string]: unknown;
}

export interface PackageState {
  downloading: boolean;
  installed: boolean;
  error: string;
  progress: InstallProgress | null;
}

export interface SetupConfig {
  corePackageId: string;
  requiredPluginIds: string[];
}

export interface RequiredPackageRow {
  id: string;
  item: CatalogItem | null;
  state: PackageState;
}

export type PackageItemsMap = Record<string, CatalogItem | null>;
export type PackageStatesMap = Record<string, PackageState>;
export type PackageVersionsMap = Record<string, string>;
