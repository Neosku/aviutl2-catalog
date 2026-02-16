import type { To } from 'react-router-dom';
import type { CarouselImage, PackageItem, PackageLicenseEntry } from '../model/types';

export interface PackageProgressView {
  ratio: number;
  percent: number;
  label: string;
}

export interface PackageHeaderSectionProps {
  item: PackageItem;
  listLink: To;
  heroImage: string;
}

export interface PackageContentSectionProps {
  item: PackageItem;
  carouselImages: CarouselImage[];
  descriptionHtml: string;
  descriptionLoading: boolean;
  descriptionError: string;
  onOpenLink: (href: string) => Promise<void>;
}

export interface PackageSidebarSectionProps {
  item: PackageItem;
  listLink: To;
  updated: string;
  latest: string;
  canInstall: boolean;
  downloading: boolean;
  updating: boolean;
  removing: boolean;
  downloadProgress: PackageProgressView;
  updateProgress: PackageProgressView;
  renderableLicenses: PackageLicenseEntry[];
  licenseTypesLabel: string;
  onOpenLicense: (license: PackageLicenseEntry) => void;
  onDownload: () => Promise<void>;
  onUpdate: () => Promise<void>;
  onRemove: () => Promise<void>;
}

export interface LicenseModalProps {
  license: PackageLicenseEntry | null;
  onClose: () => void;
}

export interface UsePackageInstallActionsResult {
  error: string;
  setError: (value: string) => void;
  downloading: boolean;
  updating: boolean;
  removing: boolean;
  downloadProgressView: PackageProgressView;
  updateProgressView: PackageProgressView;
  onDownload: () => Promise<void>;
  onUpdate: () => Promise<void>;
  onRemove: () => Promise<void>;
}
