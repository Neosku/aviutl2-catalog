/**
 * register 関連の型定義
 */
import type { Installer, Version } from '../../../utils/catalogSchema';

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
  sourcePath: string;
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

export interface RegisterInstallerTestItem {
  id: string;
  installer: Installer;
  'latest-version': string;
  versions: Version[];
}
