import type { KeyboardEvent } from 'react';
import type { PackageItem } from '../../features/package/model/types';

export interface PackageCardProps {
  item: PackageItem;
  listSearch?: string;
}

export type PackageCardActionHandler = () => Promise<void>;

export interface UsePackageCardActionsResult {
  error: string;
  setError: (value: string) => void;
  downloading: boolean;
  updating: boolean;
  removing: boolean;
  downloadRatio: number;
  updateRatio: number;
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
  downloading: boolean;
  updating: boolean;
  removing: boolean;
  downloadRatio: number;
  updateRatio: number;
  onOpenDetail: () => void;
  onCardKeyDown: (event: KeyboardEvent<HTMLDivElement>) => void;
  onDownload: PackageCardActionHandler;
  onUpdate: PackageCardActionHandler;
  onRemove: PackageCardActionHandler;
}
