import type { DeepLinkAction } from './types';
import { APP_ROUTE_PATHS, PACKAGE_DETAIL_PATH_PREFIX } from '../../../routePaths';

const DEEP_LINK_SCHEME = 'aviutl2-catalog';
const ALLOWED_STATIC_PATHS = new Set<string>(
  Object.values(APP_ROUTE_PATHS).filter((path) => !String(path).includes(':')),
);

function buildInternalPath(url: URL): string {
  const segments = [];
  const host = url.hostname || '';
  if (host) segments.push(host);

  const rawPath = url.pathname || '';
  const trimmedPath = rawPath.replace(/^\/+/, '').replace(/\/+$/, '');
  if (trimmedPath) segments.push(trimmedPath);

  const joined = segments.join('/');
  return joined ? `/${joined}` : '/';
}

function normalizeInternalPath(path: string): string {
  if (!path) return '/';

  let normalized = path.startsWith('/') ? path : `/${path}`;
  if (normalized !== '/') normalized = normalized.replace(/\/+$/, '');
  if (normalized === '/home') return '/';

  return normalized || '/';
}

export function parseDeepLink(rawUrl: string): DeepLinkAction | null {
  const trimmed = rawUrl.trim();
  if (!trimmed) return null;

  let url: URL;
  try {
    url = new URL(trimmed);
  } catch {
    return null;
  }

  if (url.protocol !== `${DEEP_LINK_SCHEME}:`) return null;

  const internalPath = normalizeInternalPath(buildInternalPath(url));
  const internalUrl = `${internalPath}${url.search || ''}${url.hash || ''}`;
  return { rawUrl: trimmed, internalPath, internalUrl };
}

export function isAllowedInternalPath(path: string): boolean {
  if (ALLOWED_STATIC_PATHS.has(path)) return true;
  if (path.startsWith(PACKAGE_DETAIL_PATH_PREFIX)) return true;
  return false;
}
