import type { CSSProperties } from 'react';
import type { PackageCardItem } from './types';

export const placeholderPatternStyle: CSSProperties = {
  backgroundImage: 'radial-gradient(circle at 2px 2px, currentColor 1px, transparent 0)',
  backgroundSize: '16px 16px',
};

export function pickThumbnail(item: PackageCardItem | null | undefined): string {
  return typeof item?.thumbnailUrl === 'string' ? item.thumbnailUrl.trim() : '';
}
