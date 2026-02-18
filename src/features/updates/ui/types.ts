import type { CSSProperties } from 'react';
import type { BulkUpdateProgress, ItemUpdateProgressMap, UpdatesItem } from '../model/types';

export interface UpdatesHeaderSectionProps {
  bulkUpdating: boolean;
  hasAnyItemUpdating: boolean;
  updatableCount: number;
  onBulkUpdate: () => void;
}

export interface BulkProgressSectionProps {
  bulkProgress: BulkUpdateProgress;
  bulkPercent: number;
  progressStyle: CSSProperties;
}

export interface UpdatesTableSectionProps {
  updatableItems: UpdatesItem[];
  itemProgress: ItemUpdateProgressMap;
  bulkUpdating: boolean;
  onUpdate: (item: UpdatesItem) => void;
}
