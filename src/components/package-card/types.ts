import type { PackageItem } from '@/utils/catalogStore';
import type { PackageInstallBusyAction } from '@/utils/usePackageInstallerActions';

export type PackageCardItem = Pick<
  PackageItem,
  | 'id'
  | 'name'
  | 'author'
  | 'packageType'
  | 'type'
  | 'tags'
  | 'summary'
  | 'images'
  | 'updatedAt'
  | 'installed'
  | 'deprecation'
> &
  Partial<
    Pick<
      PackageItem,
      | 'description'
      | 'isLatest'
      | 'installedVersion'
      | 'detectedResult'
      | 'installer'
      | 'latest-version'
      | 'latestVersion'
    >
  >;

export interface PackageCardProps {
  item: PackageCardItem;
  isPauseStateLoaded?: boolean;
  isUpdatePaused?: boolean;
  listSearch?: string;
  onBeforeOpenDetail?: () => void;
}

export type PackageCardBusyAction = PackageInstallBusyAction;

export type PackageCardActionHandler = () => Promise<void>;

export interface PackageCardProgressView {
  ratio: number;
  label: string;
}

export interface UsePackageCardActionsResult {
  error: string;
  setError: (value: string) => void;
  busyAction: PackageCardBusyAction;
  isBusy: boolean;
  progress: PackageCardProgressView;
  onDownload: PackageCardActionHandler;
  onUpdate: PackageCardActionHandler;
  onRemove: PackageCardActionHandler;
}

export interface PackageCardViewProps {
  item: PackageCardItem;
  thumbnail: string;
  category: string;
  lastUpdated: string;
  isInstalled: boolean;
  hasUpdate: boolean;
  isPauseStateLoaded: boolean;
  isUpdatePaused: boolean;
  canInstall: boolean;
  busyAction: PackageCardBusyAction;
  isBusy: boolean;
  progress: PackageCardProgressView;
  onOpenDetail: () => void;
  onDownload: PackageCardActionHandler;
  onUpdate: PackageCardActionHandler;
  onRemove: PackageCardActionHandler;
}
