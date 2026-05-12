import type { To } from 'react-router-dom';
import type { PackageInstallBusyAction } from '@/utils/usePackageInstallerActions';
import type { PackageItem } from '@/utils/catalogStore';
import type { HomeRestoreState } from '@/layouts/app-shell/types';
import type { CarouselImage, PackageLicenseEntry, PackageMarkdownState, PackageRelationSection } from '../model/types';

export interface PackageProgressView {
  ratio: number;
  percent: number;
  label: string;
}

export interface PackageHeaderSectionProps {
  item: PackageItem;
  listLink: To;
  listLabel: string;
  heroImage: string;
}

export interface PackageContentSectionProps {
  item: PackageItem;
  carouselImages: CarouselImage[];
  detailError: string;
  description: PackageMarkdownState;
  changelog: PackageMarkdownState;
  relationSections: PackageRelationSection[];
  relationsLoading: boolean;
  relationsError: string;
  onOpenLink: (href: string) => Promise<void>;
}

export interface PackageSidebarSectionProps {
  item: PackageItem;
  listLink: To;
  listLabel: string;
  listLinkState?: HomeRestoreState;
  updated: string;
  latest: string;
  originalAuthor?: string;
  packagePageUrl?: string;
  canInstall: boolean;
  busyAction: PackageInstallBusyAction;
  isBusy: boolean;
  progress: PackageProgressView;
  hasNotice: boolean;
  noticeLoading: boolean;
  renderableLicenses: PackageLicenseEntry[];
  licenseTypesLabel: string;
  onOpenNotice: () => void;
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
  busyAction: PackageInstallBusyAction;
  isBusy: boolean;
  progressView: PackageProgressView;
  noticeModal: {
    open: boolean;
    title: string;
    html: string;
  };
  closeNoticeModal: () => void;
  confirmNoticeModal: () => Promise<void>;
  onDownload: () => Promise<void>;
  onUpdate: () => Promise<void>;
  onRemove: () => Promise<void>;
}
