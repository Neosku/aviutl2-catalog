import type { PackageItem } from '../../features/package/model/types';
import type { PackageInstallBusyAction } from '../../utils/usePackageInstallerActions';

export interface PackageCardProps {
  item: PackageItem;
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
  item: PackageItem;
  thumbnail: string;
  category: string;
  lastUpdated: string;
  isInstalled: boolean;
  hasUpdate: boolean;
  canInstall: boolean;
  busyAction: PackageCardBusyAction;
  isBusy: boolean;
  progress: PackageCardProgressView;
  onOpenDetail: () => void;
  onDownload: PackageCardActionHandler;
  onUpdate: PackageCardActionHandler;
  onRemove: PackageCardActionHandler;
}
