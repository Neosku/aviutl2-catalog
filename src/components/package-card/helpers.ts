import type { CSSProperties } from 'react';
import type { PackageItem } from '../../features/package/model/types';

export const placeholderPatternStyle: CSSProperties = {
  backgroundImage: 'radial-gradient(circle at 2px 2px, currentColor 1px, transparent 0)',
  backgroundSize: '16px 16px',
};

export function pickThumbnail(item: PackageItem | null | undefined): string {
  const groups = Array.isArray(item?.images) ? item.images : [];

  for (const group of groups) {
    const candidate = typeof group?.thumbnail === 'string' ? group.thumbnail.trim() : '';
    if (candidate) return candidate;

    if (Array.isArray(group?.infoImg)) {
      const fallback = group.infoImg.find((src) => typeof src === 'string' && src.trim());
      if (fallback) return fallback.trim();
    }
  }

  return '';
}
