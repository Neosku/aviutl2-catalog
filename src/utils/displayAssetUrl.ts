import { convertFileSrc } from '@tauri-apps/api/core';
import { isUrlLike, normalizeLocalPathSegments, resolvePathOrUrl } from './catalog-schema/utils/pathUtils';

export function toDisplayAssetUrl(pathOrUrl: string): string {
  if (!pathOrUrl || isUrlLike(pathOrUrl)) {
    return pathOrUrl;
  }
  return convertFileSrc(normalizeLocalPathSegments(pathOrUrl));
}

export function resolveDisplayAssetUrl(basePathOrUrl: string, relativePathOrUrl: string): string {
  const trimmed = relativePathOrUrl.trim();
  return trimmed ? toDisplayAssetUrl(resolvePathOrUrl(basePathOrUrl, trimmed)) : '';
}
