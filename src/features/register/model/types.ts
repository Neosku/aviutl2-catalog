/**
 * register 関連の型定義
 */
export type RegisterDescriptionMode = 'inline' | 'external';
export type RegisterInstallerSourceType = 'direct' | 'github' | 'GoogleDrive' | 'booth';

export interface RegisterInstallStep {
  key: string;
  action: string;
  path: string;
  argsText: string;
  from: string;
  to: string;
  elevate: boolean;
}

export interface RegisterUninstallStep {
  key: string;
  action: string;
  path: string;
  argsText: string;
  elevate: boolean;
}

export interface RegisterVersionFile {
  key: string;
  path: string;
  hash: string;
  fileName: string;
}

export interface RegisterVersion {
  key: string;
  version: string;
  release_date: string;
  files: RegisterVersionFile[];
}

export interface RegisterCopyright {
  key: string;
  years: string;
  holder: string;
}

export interface RegisterLicense {
  key: string;
  type: string;
  licenseName: string;
  isCustom: boolean;
  licenseBody: string;
  copyrights: RegisterCopyright[];
}

export interface RegisterImageEntry {
  key: string;
  existingPath: string;
  file: File | null;
  previewUrl: string;
}

export interface RegisterImageState {
  thumbnail: RegisterImageEntry | null;
  info: RegisterImageEntry[];
}

export interface RegisterInstallerState {
  sourceType: RegisterInstallerSourceType;
  directUrl: string;
  boothUrl: string;
  githubOwner: string;
  githubRepo: string;
  githubPattern: string;
  googleDriveId: string;
  installSteps: RegisterInstallStep[];
  uninstallSteps: RegisterUninstallStep[];
}

export interface RegisterPackageForm {
  id: string;
  name: string;
  author: string;
  originalAuthor: string;
  type: string;
  summary: string;
  niconiCommonsId: string;
  descriptionText: string;
  descriptionPath: string;
  descriptionMode: RegisterDescriptionMode;
  descriptionUrl: string;
  repoURL: string;
  licenses: RegisterLicense[];
  tagsText: string;
  dependenciesText: string;
  installer: RegisterInstallerState;
  versions: RegisterVersion[];
  images: RegisterImageState;
}

export interface RegisterInstallerOption {
  value: string;
  label: string;
}

export interface RegisterCopyrightPayload {
  years: string;
  holder: string;
}

export interface RegisterLicensePayload {
  type: string;
  isCustom: boolean;
  copyrights: RegisterCopyrightPayload[];
  licenseBody: string | null;
}

export interface RegisterImagePayload {
  thumbnail?: string;
  infoImg?: string[];
}

export interface RegisterInstallStepPayload {
  action: string;
  path?: string;
  args?: string[];
  from?: string;
  to?: string;
  elevate?: boolean;
}

export interface RegisterUninstallStepPayload {
  action: string;
  path?: string;
  args?: string[];
  elevate?: boolean;
}

export interface RegisterInstallerSourcePayload {
  direct?: string;
  booth?: string;
  github?: {
    owner: string;
    repo: string;
    pattern: string;
  };
  GoogleDrive?: {
    id: string;
  };
}

export interface RegisterInstallerPayload {
  source: RegisterInstallerSourcePayload;
  install: RegisterInstallStepPayload[];
  uninstall: RegisterUninstallStepPayload[];
}

export interface RegisterVersionPayloadFile {
  path: string;
  XXH3_128: string;
}

export interface RegisterVersionPayload {
  version: string;
  release_date: string;
  file: RegisterVersionPayloadFile[];
}

export interface RegisterCatalogEntry {
  id: string;
  name: string;
  type: string;
  summary: string;
  description: string;
  author: string;
  originalAuthor?: string;
  repoURL: string;
  'latest-version': string;
  popularity?: unknown;
  trend?: unknown;
  licenses: RegisterLicensePayload[];
  niconiCommonsId?: string;
  tags: string[];
  dependencies: string[];
  images: RegisterImagePayload[];
  installer: RegisterInstallerPayload;
  version: RegisterVersionPayload[];
}

export interface RegisterInstallerTestItem {
  id: string;
  installer: RegisterInstallerPayload;
  'latest-version': string;
  versions: RegisterVersionPayload[];
}
