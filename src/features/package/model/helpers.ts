import type { CarouselImage, PackageImageGroup } from './types';

const PACKAGE_LIST_BACK_PARAM = 'back';

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
    return new URL(trimmed).toString();
  } catch {}
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

export function buildPackageDetailHref(id: string, listSearch: string): string {
  const normalizedListSearch = buildPackageListSearch(listSearch);
  const encodedId = encodeURIComponent(id);
  if (!normalizedListSearch) return `/package/${encodedId}`;

  const params = new URLSearchParams();
  params.set(PACKAGE_LIST_BACK_PARAM, normalizedListSearch);
  return `/package/${encodedId}?${params.toString()}`;
}

export function readPackageListSearchFromDetail(search: string): string {
  const normalizedSearch = search.startsWith('?') ? search.slice(1) : search;
  const params = new URLSearchParams(normalizedSearch);
  return buildPackageListSearch(params.get(PACKAGE_LIST_BACK_PARAM) || '');
}

export function collectPackageImages(imageGroups: PackageImageGroup[] | undefined): {
  heroImage: string;
  carouselImages: CarouselImage[];
} {
  const carouselImages: CarouselImage[] = [];
  let heroImage = '';

  for (const group of Array.isArray(imageGroups) ? imageGroups : []) {
    if (!Array.isArray(group?.infoImg)) continue;
    for (const src of group.infoImg) {
      if (typeof src !== 'string') continue;
      const trimmed = src.trim();
      if (!trimmed) continue;
      if (!heroImage) heroImage = trimmed;
      carouselImages.push({ src: trimmed, alt: '' });
    }
  }

  return { heroImage, carouselImages };
}
