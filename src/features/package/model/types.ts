export interface PackageImageGroup {
  thumbnail?: string;
  infoImg?: string[];
  [key: string]: unknown;
}

export interface PackageCopyright {
  years?: string;
  holder?: string;
  [key: string]: unknown;
}

export interface PackageLicense {
  type?: string;
  isCustom?: boolean;
  licenseBody?: string;
  copyrights?: PackageCopyright[];
  body?: string;
  key?: string;
  [key: string]: unknown;
}

export interface PackageInstaller {
  install?: unknown[];
  uninstall?: unknown[];
  [key: string]: unknown;
}

export interface PackageItem {
  id: string;
  name: string;
  type?: string;
  summary?: string;
  description?: string;
  author?: string;
  tags?: string[];
  dependencies?: string[];
  images?: PackageImageGroup[];
  licenses?: PackageLicense[];
  license?: string;
  installer?: PackageInstaller | string;
  downloadURL?: string;
  repoURL?: string;
  niconiCommonsId?: string;
  updatedAt?: string | number | null;
  installed?: boolean;
  installedVersion?: string;
  isLatest?: boolean;
  [key: string]: unknown;
}

export interface PackageInstallProgress {
  ratio?: number;
  percent?: number;
  label?: string;
  phase?: string;
  step?: string | null;
  stepIndex?: number | null;
  totalSteps?: number | null;
  [key: string]: unknown;
}

export interface CarouselImage {
  src: string;
  alt: string;
}

export interface PackageLicenseEntry extends PackageLicense {
  key: string;
  body: string;
}

export type CatalogDispatch = (action: { type: string; payload?: unknown }) => void;
