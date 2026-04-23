import type { CatalogBootstrapLoadResult } from './catalogClient';
import type { DetectResult } from './detectResult';
import type { Installer } from './catalogSchema';
import { isUrlLike, resolveUrl } from './catalog-schema/utils/pathUtils';

type CatalogVersionFileCompat = {
  path: string;
  XXH3_128: string;
};

type CatalogVersionCompat = {
  version: string;
  release_date: string;
  file: CatalogVersionFileCompat[];
};

type CatalogImageCompat = {
  thumbnail?: string;
  infoImg?: string[];
};

type CatalogLicenseCopyrightCompat = {
  years: string;
  holder: string;
};

type CatalogLicenseCompat = {
  type: string;
  isCustom: boolean;
  copyrights: CatalogLicenseCopyrightCompat[];
  licenseBody: string | null;
};

export type CatalogBootstrapItem = {
  id: string;
  legacyId: string;
  packageType: string;
  packageRole: string;
  addedAt: string;
  name: string;
  author: string;
  typeLabel?: string;
  type: string;
  tags: string[];
  summary: string;
  latestVersion: string;
  latestReleaseDate: string;
  thumbnailUrl: string;
  description: string;
  changelog?: {
    markdownSource: string;
  };
  repoURL: string;
  originalAuthor?: string;
  licenses: CatalogLicenseCompat[];
  niconiCommonsId?: string;
  dependencies: string[];
  images: CatalogImageCompat[];
  installer?: Installer;
  version: CatalogVersionCompat[];
  'latest-version': string;
  popularity: number;
  trend: number;
  deprecation?: {
    message: string;
  };
  updatedAt?: number | null;
  nameKey?: string;
  authorKey?: string;
  summaryKey?: string;
  installed?: boolean;
  installedVersion?: string;
  isLatest?: boolean;
  detectedResult?: DetectResult;
  catalogIndex?: number;
};

export type CatalogSearchIndexItem = {
  id: string;
  name: string;
  author: string;
  summary: string;
  packageType: string;
  tags: string[];
  latestReleaseDate: string;
};

export function buildCatalogBootstrapItems(result: CatalogBootstrapLoadResult): CatalogBootstrapItem[] {
  return result.list.packages.map((listPackage) => {
    const versionEntry = result.versions.packages[listPackage.id];
    const metricEntry = result.metrics.packages[listPackage.id];
    const thumbnailUrl = resolveOptionalAssetPath(result.baseUrls.list, listPackage.images?.thumbnail);
    const versions = Array.isArray(versionEntry?.versions)
      ? versionEntry.versions.map((version) => ({
          version: version.version,
          release_date: version.releaseDate,
          file: version.files.map((file) => ({
            path: file.path,
            XXH3_128: file.xxh128,
          })),
        }))
      : [];
    const latestVersion = versions.at(-1)?.version ?? '';
    const latestReleaseDate = versions.at(-1)?.release_date ?? '';

    return {
      id: listPackage.id,
      legacyId: listPackage.legacyId,
      packageType: listPackage.packageType,
      packageRole: listPackage.packageRole,
      addedAt: listPackage.addedAt,
      name: listPackage.name,
      author: listPackage.author,
      typeLabel: listPackage.typeLabel,
      type: listPackage.packageType,
      tags: listPackage.tags,
      summary: listPackage.summary,
      latestVersion,
      latestReleaseDate,
      thumbnailUrl,
      description: listPackage.summary,
      changelog: listPackage.changelog,
      repoURL: '',
      licenses: [],
      niconiCommonsId: listPackage.niconiCommonsId,
      dependencies: [],
      images: buildCatalogImageGroups(thumbnailUrl),
      installer: undefined,
      version: versions,
      'latest-version': latestVersion,
      popularity: metricEntry?.popularity ?? 0,
      trend: metricEntry?.trend ?? 0,
      deprecation: listPackage.deprecation,
    };
  });
}

export function buildCatalogSearchIndexItems(items: CatalogBootstrapItem[]): CatalogSearchIndexItem[] {
  return items.map((item) => ({
    id: item.id,
    name: item.name,
    author: item.author,
    summary: item.summary,
    packageType: item.packageType,
    tags: item.tags,
    latestReleaseDate: item.latestReleaseDate,
  }));
}

function buildCatalogImageGroups(thumbnailUrl: string): CatalogImageCompat[] {
  if (!thumbnailUrl) {
    return [];
  }
  return [{ thumbnail: thumbnailUrl, infoImg: [] }];
}

function resolveOptionalAssetPath(baseUrl: string, path: string | undefined): string {
  const trimmed = typeof path === 'string' ? path.trim() : '';
  if (!trimmed) {
    return '';
  }
  return isUrlLike(trimmed) ? trimmed : resolveUrl(baseUrl, trimmed);
}
