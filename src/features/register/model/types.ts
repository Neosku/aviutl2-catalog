/**
 * register 関連の型定義
 */
import type { CatalogVersion } from '@/utils/catalog-schema/shared/versionSchema';
import type { Installer } from '@/utils/installer/types';
import type { CatalogPackageRole } from '@/utils/catalog-schema/shared/commonSchema';
import type { RegisterLicenseType } from '@/utils/licenseTemplates';

export type RegisterDescriptionMode = 'inline' | 'external';
export type RegisterInstallerSourceType = 'directUrl' | 'githubRelease' | 'googleDrive' | 'booth';

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
  xxh128: string;
  fileName: string;
}

export interface RegisterVersion {
  key: string;
  version: string;
  releaseDate: string;
  files: RegisterVersionFile[];
}

export interface RegisterCopyright {
  key: string;
  years: string;
  holder: string;
}

export interface RegisterLicense {
  key: string;
  type: RegisterLicenseType | '';
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

export interface RegisterLocalizedContentForm {
  name: string;
  author: string;
  originalAuthor: string;
  deprecationEnabled: boolean;
  deprecationMessage: string;
  type: string;
  summary: string;
  descriptionText: string;
  descriptionPath: string;
  descriptionMode: RegisterDescriptionMode;
  descriptionUrl: string;
  changelogMode: RegisterDescriptionMode;
  changelogUrl: string;
  changelogPath: string;
  changelogText: string;
  noticePath: string;
  noticeText: string;
  licenses: RegisterLicense[];
  tagsText: string;
}

export interface RegisterPackageForm {
  id: string;
  legacyId: string;
  packageRole: CatalogPackageRole;
  addedAt: string;
  sourceLocale: string;
  name: string;
  author: string;
  originalAuthor: string;
  deprecationEnabled: boolean;
  deprecationMessage: string;
  type: string;
  summary: string;
  niconiCommonsId: string;
  descriptionText: string;
  descriptionPath: string;
  descriptionMode: RegisterDescriptionMode;
  descriptionUrl: string;
  changelogMode: RegisterDescriptionMode;
  changelogUrl: string;
  changelogPath: string;
  changelogText: string;
  noticePath: string;
  noticeText: string;
  packagePageUrl: string;
  licenses: RegisterLicense[];
  tagsText: string;
  relationRequiresText: string;
  relationRecommendsText: string;
  relationConflictsText: string;
  relationSimilarText: string;
  relationReplacesText: string;
  relationForkOfText: string;
  localizedContents: Record<string, RegisterLocalizedContentForm>;
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
  latestVersion: string;
  versions: CatalogVersion[];
}

export interface RegisterCatalogItem {
  id: string;
  legacyId: string;
  packageType: string;
  packageRole: string;
  name: string;
  author: string;
  summary: string;
  typeLabel?: string;
  tags: string[];
  latestVersion: string;
  latestReleaseDate: string;
  popularity: number;
  trend: number;
  registerRelevantHash?: string;
  deprecation?: {
    message: string;
  };
}
