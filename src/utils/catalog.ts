import { catalogIndexSchema, type CatalogEntry } from './catalogSchema.js';
import { formatUnknownError } from './errors.js';
import { logError } from './logging.js';

const CATALOG_CACHE_DIR = 'catalog';
const CATALOG_CACHE_FILE = `${CATALOG_CACHE_DIR}/index.json`;

export async function readCatalogCache(): Promise<CatalogEntry[]> {
  const fs = await import('@tauri-apps/plugin-fs');
  const raw = await fs.readTextFile(CATALOG_CACHE_FILE, { baseDir: fs.BaseDirectory.AppConfig });
  const trimmed = typeof raw === 'string' ? raw.trim() : '';
  if (!trimmed) {
    throw new Error('catalog cache is empty');
  }
  try {
    return normalizeCatalogData(JSON.parse(raw));
  } catch (e: unknown) {
    throw new Error(`catalog cache parse failed: ${formatUnknownError(e)}`, { cause: e });
  }
}

function normalizeCatalogData(data: unknown): CatalogEntry[] {
  const candidate =
    Array.isArray(data) || !data || typeof data !== 'object' ? data : (data as { packages?: unknown }).packages;
  const parsed = catalogIndexSchema.safeParse(candidate);
  return parsed.success ? parsed.data : [];
}

function deriveCatalogBaseUrl(rootUrl: unknown): string | null {
  if (!rootUrl || typeof rootUrl !== 'string') return null;
  const trimmed = rootUrl.trim();
  if (!trimmed) return null;
  const origin =
    typeof window !== 'undefined' && window.location && window.location.href
      ? window.location.href
      : 'app://localhost/';
  try {
    const resolved = new URL(trimmed, origin);
    const dir = new URL('.', resolved);
    return dir.toString();
  } catch {
    const withoutQuery = trimmed.split(/[?#]/)[0];
    const idx = withoutQuery.lastIndexOf('/');
    if (idx >= 0) {
      return withoutQuery.slice(0, idx + 1);
    }
    return null;
  }
}

function resolveCatalogAssetUrl(raw: unknown, baseUrl: string | null): string {
  if (typeof raw !== 'string') return '';
  const trimmed = raw.trim();
  if (!trimmed) return '';
  if (baseUrl) {
    try {
      return new URL(trimmed, baseUrl).toString();
    } catch {
      /* fall through */
    }
  }
  return trimmed;
}

function applyCatalogAssetBase(items: CatalogEntry[], baseUrl: string | null): CatalogEntry[] {
  return items.map((item) => {
    const groups = item.images.map((group) => {
      const next = { ...group };
      if (typeof group.thumbnail === 'string') {
        next.thumbnail = resolveCatalogAssetUrl(group.thumbnail, baseUrl);
      }
      const infoImages = Array.isArray(group.infoImg) ? group.infoImg : [];
      next.infoImg = infoImages.map((src) => resolveCatalogAssetUrl(src, baseUrl)).filter(Boolean);
      return next;
    });
    let description = item.description;
    if (typeof description === 'string') {
      const trimmed = description.trim();
      if (/\.md$/i.test(trimmed)) {
        const resolved = resolveCatalogAssetUrl(trimmed, baseUrl);
        if (resolved) description = resolved;
      }
    }
    return { ...item, description, images: groups };
  });
}

export async function writeCatalogCache(data: unknown): Promise<void> {
  const fs = await import('@tauri-apps/plugin-fs');
  const payload = normalizeCatalogData(data);
  await fs.mkdir(CATALOG_CACHE_DIR, { baseDir: fs.BaseDirectory.AppConfig, recursive: true });
  await fs.writeTextFile(CATALOG_CACHE_FILE, JSON.stringify(payload, null, 2), { baseDir: fs.BaseDirectory.AppConfig });
}

export async function loadCatalogData(
  options: {
    timeoutMs?: number;
  } = {},
): Promise<{ items: CatalogEntry[]; source: 'remote' | 'cache' }> {
  const remote = typeof import.meta.env.VITE_REMOTE === 'string' ? import.meta.env.VITE_REMOTE.trim() : '';
  const timeoutMs = Number.isFinite(options.timeoutMs) ? options.timeoutMs : 10000;
  let items: CatalogEntry[] | null = null;
  let source: 'remote' | 'cache' = 'cache';
  let lastError: unknown = null;
  let assetBase = deriveCatalogBaseUrl(remote);

  if (remote) {
    try {
      const ctrl = new AbortController();
      const timer = setTimeout(() => ctrl.abort(), timeoutMs);
      const res = await fetch(remote, { signal: ctrl.signal });
      clearTimeout(timer);
      if (res.ok) {
        const json = catalogIndexSchema.parse(await res.json());
        const resolvedBase = deriveCatalogBaseUrl(res.url || remote) || assetBase;
        assetBase = resolvedBase;
        items = applyCatalogAssetBase(json, assetBase);
        source = 'remote';
        try {
          await writeCatalogCache(items);
        } catch (cacheError: unknown) {
          await logError(`[catalog] cache write failed: ${formatUnknownError(cacheError)}`);
        }
      } else {
        lastError = new Error(`remote fetch http ${res.status}`);
        await logError(`[catalog] remote fetch failed: HTTP ${res.status}`);
      }
    } catch (e: unknown) {
      lastError = e;
      await logError(`[catalog] remote fetch threw: ${formatUnknownError(e)}`);
    }
  }

  if (items == null) {
    try {
      const cache = await readCatalogCache();
      items = applyCatalogAssetBase(cache, assetBase);
      source = 'cache';
    } catch (e: unknown) {
      lastError = e;
      await logError(`[catalog] cache read failed: ${formatUnknownError(e)}`);
    }
  }

  if (items == null) {
    if (lastError) throw lastError;
    throw new Error('catalog data unavailable');
  }

  return { items, source };
}

export function latestVersionOf(item: unknown): string {
  if (!item || typeof item !== 'object') return '';
  const withVersions = item as { versions?: unknown; version?: unknown };
  const arr = Array.isArray(withVersions.versions)
    ? withVersions.versions
    : Array.isArray(withVersions.version)
      ? withVersions.version
      : [];
  if (!arr.length) return '';
  const last = arr[arr.length - 1] as { version?: unknown } | undefined;
  return typeof last?.version === 'string' ? last.version : '';
}
