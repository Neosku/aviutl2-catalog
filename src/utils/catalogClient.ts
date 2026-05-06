import * as tauriFs from '@tauri-apps/plugin-fs';
import * as tauriHttp from '@tauri-apps/plugin-http';
import type { ZodType } from 'zod';
import { catalogDetailSchema, type CatalogDetail } from '@/utils/catalog-schema/distribution/detailSchema';
import { catalogInstallSchema, type CatalogInstall } from '@/utils/catalog-schema/distribution/installSchema';
import { catalogListSchema, type CatalogList } from '@/utils/catalog-schema/distribution/listSchema';
import { manifestSchema, type CatalogManifest } from '@/utils/catalog-schema/distribution/manifestSchema';
import { catalogMetricsSchema, type CatalogMetrics } from '@/utils/catalog-schema/distribution/metricsSchema';
import { catalogVersionsSchema, type CatalogVersions } from '@/utils/catalog-schema/distribution/versionsSchema';
import {
  sourceContentSchema,
  sourceInstallSchema,
  sourceMetaSchema,
  sourceVersionsSchema,
  type SourcePackage,
} from '@/utils/catalog-schema/source/sourceSchema';
import { resolveRequestedLocale } from '@/utils/catalog-schema/utils/localeResolver';
import {
  dirnamePath,
  isUrlLike,
  joinPath,
  normalizeLocalPathSegments,
  resolvePathOrUrl,
  resolveUrl,
} from '@/utils/catalog-schema/utils/pathUtils';
import { resolveSourcePackagePaths, type SourcePackagePathSet } from '@/utils/catalog-schema/utils/sourcePathResolver';
import { formatUnknownError } from '@/utils/errors';
import { ipc } from '@/utils/invokeIpc';
import { logError } from '@/utils/logging';
import { getSettings } from '@/utils/settings';

const CATALOG_CACHE_ROOT = 'catalog';
const MANIFEST_CACHE_FILE = `${CATALOG_CACHE_ROOT}/manifest.json`;
const DEFAULT_TIMEOUT_MS = 10000;

type CacheSource = 'remote' | 'cache' | 'local';

type ManifestArtifact = CatalogManifest['paths']['versions'];

type ManifestContext = {
  manifest: CatalogManifest;
  previousManifest: CatalogManifest | null;
  manifestSource: CacheSource;
  manifestUrl: string;
  manifestBaseUrl: string;
  manifestBaseLocation: CatalogBaseLocation;
};

type CatalogManifestLocation =
  | {
      kind: 'remote';
      manifestUrl: string;
    }
  | {
      kind: 'local';
      manifestPath: string;
    };

type CatalogBaseLocation =
  | {
      kind: 'remote';
      baseUrl: string;
    }
  | {
      kind: 'local';
      basePath: string;
    };

type DistributionArtifactLoadResult<T> = {
  data: T;
  source: CacheSource;
  artifactBaseUrl: string;
};

export type CatalogBootstrapLoadResult = {
  manifest: CatalogManifest;
  locale: string;
  list: CatalogList;
  versions: CatalogVersions;
  metrics: CatalogMetrics;
  sources: {
    manifest: CacheSource;
    list: CacheSource;
    versions: CacheSource;
    metrics: CacheSource;
  };
  baseUrls: {
    manifest: string;
    list: string;
    versions: string;
    metrics: string;
  };
};

export type CatalogInstallLoadResult = {
  manifest: CatalogManifest;
  install: CatalogInstall;
  sources: {
    manifest: CacheSource;
    install: CacheSource;
  };
  baseUrls: {
    manifest: string;
    install: string;
  };
};

export type CatalogDetailLoadResult = {
  manifest: CatalogManifest;
  locale: string;
  detail: CatalogDetail;
  sources: {
    manifest: CacheSource;
    detail: CacheSource;
  };
  baseUrls: {
    manifest: string;
    detail: string;
  };
};

export type SourcePackageLoadResult = {
  package: SourcePackage;
  locale: string;
  paths: SourcePackagePathSet;
  packageBasePath: string;
  markdown: {
    description: string;
    changelog: string;
    notice: string;
  };
};

let manifestContextPromise: Promise<ManifestContext> | null = null;
let installCatalogPromise: Promise<CatalogInstallLoadResult> | null = null;
const detailCatalogPromises = new Map<string, Promise<CatalogDetailLoadResult>>();
const markdownPromises = new Map<string, Promise<string>>();
const sourcePackagePromises = new Map<string, Promise<SourcePackageLoadResult>>();

export function clearCatalogClientSessionCache(): void {
  manifestContextPromise = null;
  installCatalogPromise = null;
  detailCatalogPromises.clear();
  markdownPromises.clear();
  sourcePackagePromises.clear();
}

export async function loadBootstrapCatalog(
  options: {
    requestedLocale?: string | null;
    timeoutMs?: number;
  } = {},
): Promise<CatalogBootstrapLoadResult> {
  const timeoutMs = normalizeTimeout(options.timeoutMs);
  const context = await loadManifestContext(timeoutMs);
  const locale = resolveRequestedLocale(
    options.requestedLocale,
    context.manifest.locales,
    context.manifest.fallbackLocale,
  );
  const listArtifact = context.manifest.paths.list[locale];
  if (!listArtifact) {
    throw new Error(`catalog list artifact is missing for locale "${locale}"`);
  }

  const [listResult, versionsResult, metricsResult] = await Promise.all([
    loadDistributionArtifact({
      context,
      currentArtifact: listArtifact,
      previousArtifact: context.previousManifest?.paths.list[locale],
      schema: catalogListSchema,
      timeoutMs,
      cacheLabel: `catalog-list/${locale}`,
    }),
    loadDistributionArtifact({
      context,
      currentArtifact: context.manifest.paths.versions,
      previousArtifact: context.previousManifest?.paths.versions,
      schema: catalogVersionsSchema,
      timeoutMs,
      cacheLabel: 'catalog-versions',
    }),
    loadDistributionArtifact({
      context,
      currentArtifact: context.manifest.paths.metrics,
      previousArtifact: context.previousManifest?.paths.metrics,
      schema: catalogMetricsSchema,
      timeoutMs,
      cacheLabel: 'catalog-metrics',
    }),
  ]);

  return {
    manifest: context.manifest,
    locale,
    list: listResult.data,
    versions: versionsResult.data,
    metrics: metricsResult.data,
    sources: {
      manifest: context.manifestSource,
      list: listResult.source,
      versions: versionsResult.source,
      metrics: metricsResult.source,
    },
    baseUrls: {
      manifest: context.manifestBaseUrl,
      list: listResult.artifactBaseUrl,
      versions: versionsResult.artifactBaseUrl,
      metrics: metricsResult.artifactBaseUrl,
    },
  };
}

export async function loadInstallCatalog(
  options: {
    timeoutMs?: number;
  } = {},
): Promise<CatalogInstallLoadResult> {
  if (installCatalogPromise) {
    return await installCatalogPromise;
  }

  const promise = loadInstallCatalogInternal(options).catch((error: unknown) => {
    installCatalogPromise = null;
    throw error;
  });
  installCatalogPromise = promise;
  return await promise;
}

async function loadInstallCatalogInternal(options: { timeoutMs?: number }): Promise<CatalogInstallLoadResult> {
  const timeoutMs = normalizeTimeout(options.timeoutMs);
  const context = await loadManifestContext(timeoutMs);
  const installResult = await loadDistributionArtifact({
    context,
    currentArtifact: context.manifest.paths.install,
    previousArtifact: context.previousManifest?.paths.install,
    schema: catalogInstallSchema,
    timeoutMs,
    cacheLabel: 'catalog-install',
  });

  return {
    manifest: context.manifest,
    install: installResult.data,
    sources: {
      manifest: context.manifestSource,
      install: installResult.source,
    },
    baseUrls: {
      manifest: context.manifestBaseUrl,
      install: installResult.artifactBaseUrl,
    },
  };
}

export async function loadDetailCatalog(
  options: {
    requestedLocale?: string | null;
    timeoutMs?: number;
  } = {},
): Promise<CatalogDetailLoadResult> {
  const timeoutMs = normalizeTimeout(options.timeoutMs);
  const context = await loadManifestContext(timeoutMs);
  const locale = resolveRequestedLocale(
    options.requestedLocale,
    context.manifest.locales,
    context.manifest.fallbackLocale,
  );
  const cachedPromise = detailCatalogPromises.get(locale);
  if (cachedPromise) {
    return await cachedPromise;
  }

  const promise = loadDetailCatalogInternal({ context, locale, timeoutMs }).catch((error: unknown) => {
    detailCatalogPromises.delete(locale);
    throw error;
  });
  detailCatalogPromises.set(locale, promise);
  return await promise;
}

async function loadDetailCatalogInternal(options: {
  context: ManifestContext;
  locale: string;
  timeoutMs: number;
}): Promise<CatalogDetailLoadResult> {
  const detailArtifact = options.context.manifest.paths.detail[options.locale];
  if (!detailArtifact) {
    throw new Error(`catalog detail artifact is missing for locale "${options.locale}"`);
  }

  const detailResult = await loadDistributionArtifact({
    context: options.context,
    currentArtifact: detailArtifact,
    previousArtifact: options.context.previousManifest?.paths.detail[options.locale],
    schema: catalogDetailSchema,
    timeoutMs: options.timeoutMs,
    cacheLabel: `catalog-detail/${options.locale}`,
  });

  return {
    manifest: options.context.manifest,
    locale: options.locale,
    detail: detailResult.data,
    sources: {
      manifest: options.context.manifestSource,
      detail: detailResult.source,
    },
    baseUrls: {
      manifest: options.context.manifestBaseUrl,
      detail: detailResult.artifactBaseUrl,
    },
  };
}

export async function loadMarkdown(
  markdownSource: string,
  baseUrl: string,
  options: {
    timeoutMs?: number;
  } = {},
): Promise<string> {
  const resolvedUrl = resolvePathOrUrl(baseUrl, markdownSource);
  const cachedPromise = markdownPromises.get(resolvedUrl);
  if (cachedPromise) {
    return await cachedPromise;
  }

  const timeoutMs = normalizeTimeout(options.timeoutMs);
  const promise = readTextLocation(resolvedUrl, timeoutMs).catch((error: unknown) => {
    markdownPromises.delete(resolvedUrl);
    throw error;
  });
  markdownPromises.set(resolvedUrl, promise);
  return await promise;
}

export async function loadSourcePackage(options: {
  packageId: string;
  requestedLocale?: string | null;
  timeoutMs?: number;
}): Promise<SourcePackageLoadResult> {
  const packageId = options.packageId.trim();
  const localeCandidates = buildSourceLocaleCandidates(options.requestedLocale);
  const cacheKey = `${packageId}:${localeCandidates.join('|')}`;
  const cachedPromise = sourcePackagePromises.get(cacheKey);
  if (cachedPromise) {
    return await cachedPromise;
  }

  const promise = loadSourcePackageInternal({
    packageId,
    localeCandidates,
    timeoutMs: normalizeTimeout(options.timeoutMs),
  }).catch((error: unknown) => {
    sourcePackagePromises.delete(cacheKey);
    throw error;
  });
  sourcePackagePromises.set(cacheKey, promise);
  return await promise;
}

async function loadSourcePackageInternal(options: {
  packageId: string;
  localeCandidates: string[];
  timeoutMs: number;
}): Promise<SourcePackageLoadResult> {
  const sourcePackagesRoot = getSourcePackagesRoot();
  const basePaths = resolveSourcePackagePaths(
    sourcePackagesRoot,
    options.packageId,
    options.localeCandidates[0] ?? 'ja',
  );
  const [meta, install, versions] = await Promise.all([
    readSourceJson(basePaths.metaPath, sourceMetaSchema, options.timeoutMs),
    readSourceJson(basePaths.installPath, sourceInstallSchema, options.timeoutMs),
    readSourceJson(basePaths.versionsPath, sourceVersionsSchema, options.timeoutMs),
  ]);

  let lastError: unknown = null;
  for (const locale of options.localeCandidates) {
    const paths = resolveSourcePackagePaths(sourcePackagesRoot, options.packageId, locale);
    try {
      const content = await readSourceJson(paths.contentPath, sourceContentSchema, options.timeoutMs);
      const [description, changelog, notice] = await Promise.all([
        readSourceMarkdown(paths.packageBasePath, content.description.markdownSource, options.timeoutMs),
        readOptionalSourceMarkdown(paths.packageBasePath, content.changelog?.markdownSource, options.timeoutMs),
        readOptionalSourceMarkdown(paths.packageBasePath, content.notice?.markdownSource, options.timeoutMs),
      ]);

      return {
        package: {
          meta,
          content,
          install,
          versions,
        },
        locale,
        paths,
        packageBasePath: paths.packageBasePath,
        markdown: {
          description,
          changelog,
          notice,
        },
      };
    } catch (error: unknown) {
      lastError = error;
      await logError(`[catalogClient] source package ${options.packageId}/${locale}: ${formatUnknownError(error)}`);
    }
  }

  throw new Error(`source package content is unavailable for ${options.packageId}: ${formatUnknownError(lastError)}`);
}

async function loadManifestContext(timeoutMs: number): Promise<ManifestContext> {
  if (manifestContextPromise) {
    return await manifestContextPromise;
  }

  const promise = createManifestContext(timeoutMs).catch((error: unknown) => {
    manifestContextPromise = null;
    throw error;
  });
  manifestContextPromise = promise;
  return await promise;
}

async function createManifestContext(timeoutMs: number): Promise<ManifestContext> {
  const manifestLocation = await getConfiguredManifestLocation();
  const manifestUrl = getManifestLocationLabel(manifestLocation);

  if (manifestLocation.kind === 'local') {
    const localManifest = await readJsonWithSchema(manifestLocation.manifestPath, manifestSchema, timeoutMs);
    const manifestBaseLocation: CatalogBaseLocation = {
      kind: 'local',
      basePath: dirnamePath(manifestLocation.manifestPath),
    };
    return {
      manifest: localManifest.data,
      previousManifest: null,
      manifestSource: 'local',
      manifestUrl,
      manifestBaseUrl: manifestBaseLocation.basePath,
      manifestBaseLocation,
    };
  }

  const cachedManifest = await tryReadCachedJson(MANIFEST_CACHE_FILE, manifestSchema, 'manifest cache read failed');

  try {
    const remoteManifest = await readJsonWithSchema(manifestUrl, manifestSchema, timeoutMs);
    await writeCachedJson(MANIFEST_CACHE_FILE, remoteManifest.data);
    const manifestBaseUrl = resolveUrl(remoteManifest.resolvedLocation, '.');
    return {
      manifest: remoteManifest.data,
      previousManifest: cachedManifest,
      manifestSource: 'remote',
      manifestUrl: remoteManifest.resolvedLocation,
      manifestBaseUrl,
      manifestBaseLocation: {
        kind: 'remote',
        baseUrl: manifestBaseUrl,
      },
    };
  } catch (error: unknown) {
    await logError(`[catalogClient] manifest fetch failed: ${formatUnknownError(error)}`);
    if (!cachedManifest) {
      throw new Error(`catalog manifest is unavailable: ${formatUnknownError(error)}`, { cause: error });
    }
    return {
      manifest: cachedManifest,
      previousManifest: cachedManifest,
      manifestSource: 'cache',
      manifestUrl,
      manifestBaseUrl: resolveUrl(manifestUrl, '.'),
      manifestBaseLocation: {
        kind: 'remote',
        baseUrl: resolveUrl(manifestUrl, '.'),
      },
    };
  }
}

async function loadDistributionArtifact<T>(options: {
  context: ManifestContext;
  currentArtifact: ManifestArtifact;
  previousArtifact: ManifestArtifact | undefined;
  schema: ZodType<T>;
  timeoutMs: number;
  cacheLabel: string;
}): Promise<DistributionArtifactLoadResult<T>> {
  const cachePath = resolveCachePath(options.currentArtifact);
  const artifactLocation = resolveDistributionArtifactLocation(
    options.context.manifestBaseLocation,
    options.currentArtifact,
  );
  const artifactBaseUrl = resolveDistributionBaseLocation(
    options.context.manifestBaseLocation,
    options.currentArtifact,
  );

  if (options.context.manifestSource === 'local') {
    const localData = await readZstdJsonWithSchema(artifactLocation, options.schema, options.timeoutMs);
    return {
      data: localData,
      source: 'local',
      artifactBaseUrl,
    };
  }

  const shouldPreferCache =
    options.context.manifestSource === 'cache' ||
    options.previousArtifact?.zstd.sha256 === options.currentArtifact.zstd.sha256;

  if (shouldPreferCache) {
    try {
      const cached = await readCachedJson(cachePath, options.schema);
      return {
        data: cached,
        source: 'cache',
        artifactBaseUrl,
      };
    } catch (error: unknown) {
      if (options.context.manifestSource === 'cache') {
        throw new Error(`${options.cacheLabel} cache is unavailable: ${formatUnknownError(error)}`, { cause: error });
      }
      await logError(`[catalogClient] ${options.cacheLabel} cache miss: ${formatUnknownError(error)}`);
    }
  }

  if (options.context.manifestSource !== 'remote') {
    throw new Error(`${options.cacheLabel} is unavailable because no remote manifest is loaded`);
  }

  const remoteData = await readZstdJsonWithSchema(artifactLocation, options.schema, options.timeoutMs);
  await writeCachedJson(cachePath, remoteData);
  return {
    data: remoteData,
    source: 'remote',
    artifactBaseUrl,
  };
}

async function readJsonWithSchema<T>(
  location: string,
  schema: ZodType<T>,
  timeoutMs: number,
): Promise<{
  data: T;
  resolvedLocation: string;
}> {
  const remotePayload = isUrlLike(location) ? await fetchJsonText(location, timeoutMs) : null;
  const sourceLabel = remotePayload ? remotePayload.resolvedUrl : normalizeLocalPathSegments(location);
  const raw = remotePayload ? remotePayload.text : await tauriFs.readTextFile(normalizeLocalPathSegments(location));

  let payload: unknown;
  try {
    payload = JSON.parse(raw);
  } catch (error: unknown) {
    throw new Error(`failed to parse JSON from ${sourceLabel}: ${formatUnknownError(error)}`, { cause: error });
  }

  return {
    data: schema.parse(payload),
    resolvedLocation: sourceLabel,
  };
}

async function readZstdJsonWithSchema<T>(location: string, schema: ZodType<T>, timeoutMs: number): Promise<T> {
  let compressedBytes: number[];
  try {
    compressedBytes = isUrlLike(location)
      ? await fetchBinaryBytes(location, timeoutMs)
      : Array.from(await tauriFs.readFile(normalizeLocalPathSegments(location)));
  } catch (error: unknown) {
    throw new Error(`failed to read zstd payload from ${location}: ${formatUnknownError(error)}`, { cause: error });
  }

  let jsonText = '';
  try {
    jsonText = await ipc.decompressZstdToUtf8({ bytes: compressedBytes });
  } catch (error: unknown) {
    throw new Error(`failed to decompress zstd payload from ${location}: ${formatUnknownError(error)}`, {
      cause: error,
    });
  }

  let payload: unknown;
  try {
    payload = JSON.parse(jsonText);
  } catch (error: unknown) {
    throw new Error(`failed to parse decompressed JSON from ${location}: ${formatUnknownError(error)}`, {
      cause: error,
    });
  }

  return schema.parse(payload);
}

async function fetchText(url: string, timeoutMs: number): Promise<string> {
  const response = await fetchResponse(url, timeoutMs);
  if (!response.ok) {
    throw new Error(`HTTP ${response.status} for ${url}`);
  }
  return await response.text();
}

async function fetchJsonText(url: string, timeoutMs: number): Promise<{ text: string; resolvedUrl: string }> {
  const response = await fetchResponse(url, timeoutMs);
  if (!response.ok) {
    throw new Error(`HTTP ${response.status} for ${url}`);
  }
  return {
    text: await response.text(),
    resolvedUrl: response.url || url,
  };
}

async function fetchBinaryBytes(url: string, timeoutMs: number): Promise<number[]> {
  const response = await fetchResponse(url, timeoutMs);
  if (!response.ok) {
    throw new Error(`HTTP ${response.status} for ${url}`);
  }
  const buffer = await response.arrayBuffer();
  return Array.from(new Uint8Array(buffer));
}

async function readSourceJson<T>(location: string, schema: ZodType<T>, timeoutMs: number): Promise<T> {
  const raw = await readTextLocation(location, timeoutMs);
  let payload: unknown;
  try {
    payload = JSON.parse(raw);
  } catch (error: unknown) {
    throw new Error(`failed to parse source JSON ${location}: ${formatUnknownError(error)}`, { cause: error });
  }
  return schema.parse(payload);
}

async function readOptionalSourceMarkdown(
  packageBasePath: string,
  markdownSource: string | undefined,
  timeoutMs: number,
): Promise<string> {
  const source = typeof markdownSource === 'string' ? markdownSource.trim() : '';
  if (!source) {
    return '';
  }

  try {
    return await readTextLocation(resolveSourceAssetPath(packageBasePath, source), timeoutMs);
  } catch (error: unknown) {
    await logError(`[catalogClient] source markdown ${source}: ${formatUnknownError(error)}`);
    return '';
  }
}

async function readSourceMarkdown(packageBasePath: string, markdownSource: string, timeoutMs: number): Promise<string> {
  const source = markdownSource.trim();
  if (!source) {
    throw new Error('source markdown path is empty');
  }
  return await readTextLocation(resolveSourceAssetPath(packageBasePath, source), timeoutMs);
}

async function readTextLocation(location: string, timeoutMs: number): Promise<string> {
  if (isUrlLike(location)) {
    return await fetchText(location, timeoutMs);
  }
  return await tauriFs.readTextFile(normalizeLocalPathSegments(location));
}

function resolveSourceAssetPath(packageBasePath: string, relativePathOrUrl: string): string {
  if (isUrlLike(relativePathOrUrl)) {
    return relativePathOrUrl;
  }
  if (isUrlLike(packageBasePath)) {
    return resolveUrl(packageBasePath, relativePathOrUrl);
  }
  return joinPath(packageBasePath, relativePathOrUrl);
}

async function fetchResponse(url: string, timeoutMs: number): Promise<Response> {
  return await new Promise<Response>((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(new Error(`request timed out after ${timeoutMs}ms: ${url}`));
    }, timeoutMs);

    void (async () => {
      try {
        const response = await tauriHttp.fetch(url);
        clearTimeout(timer);
        resolve(response);
      } catch (error: unknown) {
        clearTimeout(timer);
        reject(error);
      }
    })();
  });
}

async function tryReadCachedJson<T>(relPath: string, schema: ZodType<T>, logLabel: string): Promise<T | null> {
  try {
    return await readCachedJson(relPath, schema);
  } catch (error: unknown) {
    await logError(`[catalogClient] ${logLabel}: ${formatUnknownError(error)}`);
    return null;
  }
}

async function readCachedJson<T>(relPath: string, schema: ZodType<T>): Promise<T> {
  const raw = await tauriFs.readTextFile(relPath, { baseDir: tauriFs.BaseDirectory.AppConfig });
  let payload: unknown;
  try {
    payload = JSON.parse(raw);
  } catch (error: unknown) {
    throw new Error(`failed to parse cache JSON ${relPath}: ${formatUnknownError(error)}`, { cause: error });
  }
  return schema.parse(payload);
}

async function writeCachedJson(relPath: string, data: unknown): Promise<void> {
  const dirPath = dirname(relPath);
  if (dirPath) {
    await tauriFs.mkdir(dirPath, { baseDir: tauriFs.BaseDirectory.AppConfig, recursive: true });
  }
  await tauriFs.writeTextFile(relPath, JSON.stringify(data, null, 2), {
    baseDir: tauriFs.BaseDirectory.AppConfig,
  });
}

function resolveCachePath(artifact: ManifestArtifact): string {
  const artifactJsonPath = artifact.json?.path ?? stripZstdSuffix(artifact.zstd.path);
  return `${CATALOG_CACHE_ROOT}/${normalizeRelativePath(artifactJsonPath)}`;
}

function resolveDistributionArtifactLocation(baseLocation: CatalogBaseLocation, artifact: ManifestArtifact): string {
  return resolveBaseLocationPath(baseLocation, artifact.zstd.path);
}

function resolveDistributionBaseLocation(baseLocation: CatalogBaseLocation, artifact: ManifestArtifact): string {
  const artifactLocation = resolveDistributionArtifactLocation(baseLocation, artifact);
  if (isUrlLike(artifactLocation)) {
    return resolveUrl(artifactLocation, '.');
  }
  return dirnamePath(artifactLocation);
}

function resolveBaseLocationPath(baseLocation: CatalogBaseLocation, relativePath: string): string {
  if (isUrlLike(relativePath)) {
    return relativePath;
  }
  if (baseLocation.kind === 'remote') {
    return resolveUrl(baseLocation.baseUrl, relativePath);
  }
  return joinPath(baseLocation.basePath, relativePath);
}

function stripZstdSuffix(path: string): string {
  if (!/\.zst$/i.test(path)) {
    throw new Error(`artifact zstd path must end with .zst: ${path}`);
  }
  return path.replace(/\.zst$/i, '');
}

function normalizeRelativePath(path: string): string {
  return path.replace(/\\/g, '/').replace(/^\.\//, '').replace(/^\/+/, '');
}

function dirname(path: string): string {
  const normalized = normalizeRelativePath(path);
  const lastSlashIndex = normalized.lastIndexOf('/');
  return lastSlashIndex >= 0 ? normalized.slice(0, lastSlashIndex) : '';
}

async function getConfiguredManifestLocation(): Promise<CatalogManifestLocation> {
  const settings = await getSettings();
  const localModeEnabled = settings.local_mode_enabled === true;
  const localManifestPath = String(settings.local_manifest_path || '').trim();
  if (localModeEnabled) {
    if (!localManifestPath) {
      throw new Error('local manifest path is not configured');
    }
    return {
      kind: 'local',
      manifestPath: localManifestPath,
    };
  }

  const raw = typeof import.meta.env.VITE_REMOTE === 'string' ? import.meta.env.VITE_REMOTE.trim() : '';
  if (!raw) {
    throw new Error('VITE_REMOTE is not configured');
  }
  if (isUrlLike(raw)) {
    return {
      kind: 'remote',
      manifestUrl: raw,
    };
  }

  const origin =
    typeof window !== 'undefined' && window.location && window.location.href
      ? window.location.href
      : 'app://localhost/';
  return {
    kind: 'remote',
    manifestUrl: new URL(raw, origin).toString(),
  };
}

function getManifestLocationLabel(location: CatalogManifestLocation): string {
  return location.kind === 'remote' ? location.manifestUrl : normalizeLocalPathSegments(location.manifestPath);
}

function getSourcePackagesRoot(): string {
  const raw =
    typeof import.meta.env.VITE_SOURCE_PACKAGES_ROOT === 'string'
      ? import.meta.env.VITE_SOURCE_PACKAGES_ROOT.trim()
      : '';
  if (!raw) {
    throw new Error('VITE_SOURCE_PACKAGES_ROOT is not configured');
  }
  if (isUrlLike(raw)) {
    return raw;
  }
  return raw;
}

function buildSourceLocaleCandidates(requestedLocale: string | null | undefined): string[] {
  const candidates = new Set<string>();
  const requested = typeof requestedLocale === 'string' ? requestedLocale.trim() : '';
  if (requested) {
    candidates.add(requested);
    const language = requested.split('-')[0]?.trim();
    if (language) {
      candidates.add(language);
    }
  }
  candidates.add('ja');
  return Array.from(candidates);
}

function normalizeTimeout(timeoutMs: number | undefined): number {
  return Number.isFinite(timeoutMs) && timeoutMs != null && timeoutMs > 0 ? timeoutMs : DEFAULT_TIMEOUT_MS;
}
