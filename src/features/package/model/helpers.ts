import type { PackageTypeTranslationKey } from '@/utils/query';
import { packageTypeKeyFromRaw, packageTypeKeyToTranslationKey } from '@/utils/query';

const PACKAGE_LIST_BACK_PARAM = 'back';
const PACKAGE_DETAIL_SOURCE_PARAM = 'source';
type PackageTypeLabelKey = `common:packageTypes.${PackageTypeTranslationKey}`;
type PackageTypeTranslator = (key: PackageTypeLabelKey, options?: { defaultValue?: string }) => string;

export type PackageDetailSource = 'home' | 'updates' | 'niconi-commons';

export function isMarkdownFilePath(path: string): boolean {
  const trimmedPath = path.trim();
  if (!trimmedPath || trimmedPath.includes('\n')) return false;
  return (
    !!trimmedPath.match(/http(s)?:\/\/.+/) ||
    !!trimmedPath.match(/^[./]?([^/]+\/)*[^/]+\.(md|markdown|mdown|mkdn?|mdwn|mdtxt|mdtext|text|txt)(\?.*)?$/i)
  );
}

export function resolveMarkdownUrl(path: string, baseUrl: string): string {
  const trimmed = String(path || '').trim();
  if (!trimmed) throw new Error('Empty markdown path');
  try {
    return new URL(trimmed, baseUrl).toString();
  } catch {}
  throw new Error('Unable to resolve markdown path');
}

export function shouldOpenExternalLink(href: string): boolean {
  const trimmed = String(href || '').trim();
  if (!trimmed) return false;
  if (trimmed.startsWith('#')) return false;
  if (/^javascript:/i.test(trimmed)) return false;
  return true;
}

export function buildPackageListSearch(
  baseSearch: string,
  overrides: {
    q?: string | null;
    tags?: string[] | null;
  } = {},
): string {
  const normalizedBase = baseSearch.startsWith('?') ? baseSearch.slice(1) : baseSearch;
  const params = new URLSearchParams(normalizedBase);

  if ('q' in overrides) {
    const q = String(overrides.q || '').trim();
    if (q) params.set('q', q);
    else params.delete('q');
  }

  if ('tags' in overrides) {
    const tags = Array.isArray(overrides.tags)
      ? overrides.tags.map((tag) => String(tag || '').trim()).filter(Boolean)
      : [];
    if (tags.length) params.set('tags', tags.join(','));
    else params.delete('tags');
  }

  const next = params.toString();
  return next ? `?${next}` : '';
}

export function buildPackageDetailHref(id: string, listSearch: string, source: PackageDetailSource = 'home'): string {
  const normalizedListSearch = buildPackageListSearch(listSearch);
  const encodedId = encodeURIComponent(id);
  if (!normalizedListSearch && source === 'home') return `/package/${encodedId}`;

  const params = new URLSearchParams();
  if (normalizedListSearch) params.set(PACKAGE_LIST_BACK_PARAM, normalizedListSearch);
  if (source !== 'home') params.set(PACKAGE_DETAIL_SOURCE_PARAM, source);
  return `/package/${encodedId}?${params.toString()}`;
}

export function readPackageListSearchFromDetail(search: string): string {
  const normalizedSearch = search.startsWith('?') ? search.slice(1) : search;
  const params = new URLSearchParams(normalizedSearch);
  return buildPackageListSearch(params.get(PACKAGE_LIST_BACK_PARAM) || '');
}

export function readPackageDetailSource(search: string): PackageDetailSource {
  const normalizedSearch = search.startsWith('?') ? search.slice(1) : search;
  const params = new URLSearchParams(normalizedSearch);
  const source = params.get(PACKAGE_DETAIL_SOURCE_PARAM);
  if (source === 'updates') return 'updates';
  if (source === 'niconi-commons') return 'niconi-commons';
  return 'home';
}

export function resolvePackageTypeLabel(
  rawType: unknown,
  t: PackageTypeTranslator,
  uncategorizedLabel: string,
  typeLabel?: unknown,
): string {
  const normalizedType = typeof rawType === 'string' ? rawType.trim() : '';
  if (!normalizedType) return uncategorizedLabel;
  if (normalizedType === 'custom') {
    const customLabel = typeof typeLabel === 'string' ? typeLabel.trim() : '';
    if (customLabel) return customLabel;
  }

  const typeKey = packageTypeKeyFromRaw(normalizedType);
  if (typeKey === 'other') return normalizedType;

  return t(`common:packageTypes.${packageTypeKeyToTranslationKey(typeKey)}`, { defaultValue: normalizedType });
}
