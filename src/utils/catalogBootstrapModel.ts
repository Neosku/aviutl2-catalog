import type { CatalogBootstrapLoadResult } from './catalogClient';
import { isUrlLike, resolveUrl } from './catalog-schema/utils/pathUtils';

export type CatalogBootstrapVersionFile = {
  path: string;
  xxh128: string;
};

export type CatalogBootstrapVersion = {
  version: string;
  releaseDate: string;
  files: CatalogBootstrapVersionFile[];
};

export type CatalogBootstrapPackage = {
  id: string;
  legacyId: string;
  packageType: string;
  packageRole: string;
  addedAt: string;
  name: string;
  author: string;
  typeLabel?: string;
  tags: string[];
  summary: string;
  latestVersion: string;
  latestReleaseDate: string;
  versions: CatalogBootstrapVersion[];
  thumbnailUrl: string;
  changelog?: {
    markdownSource: string;
  };
  niconiCommonsId?: string;
  popularity: number;
  trend: number;
  deprecation?: {
    message: string;
  };
  updatedAt?: number | null;
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

export function buildCatalogBootstrapPackages(result: CatalogBootstrapLoadResult): CatalogBootstrapPackage[] {
  return result.list.packages.map((listPackage) => {
    const versionEntry = result.versions.packages[listPackage.id];
    const metricEntry = result.metrics.packages[listPackage.id];
    const thumbnailUrl = resolveOptionalAssetPath(result.baseUrls.list, listPackage.images?.thumbnail);
    const versions =
      versionEntry?.versions.map((version) => ({
        version: version.version,
        releaseDate: version.releaseDate,
        files: version.files.map((file) => ({
          path: file.path,
          xxh128: file.xxh128,
        })),
      })) ?? [];
    const latestVersion = versions.at(-1)?.version ?? '';
    const latestReleaseDate = versions.at(-1)?.releaseDate ?? '';
    const changelogSource = listPackage.changelog?.markdownSource
      ? resolveOptionalAssetPath(result.baseUrls.list, listPackage.changelog.markdownSource)
      : '';

    return {
      id: listPackage.id,
      legacyId: listPackage.legacyId,
      packageType: listPackage.packageType,
      packageRole: listPackage.packageRole,
      addedAt: listPackage.addedAt,
      name: listPackage.name,
      author: listPackage.author,
      typeLabel: listPackage.typeLabel,
      tags: listPackage.tags,
      summary: listPackage.summary,
      latestVersion,
      latestReleaseDate,
      versions,
      thumbnailUrl,
      changelog: changelogSource
        ? {
            markdownSource: changelogSource,
          }
        : undefined,
      niconiCommonsId: listPackage.niconiCommonsId,
      popularity: metricEntry?.popularity ?? 0,
      trend: metricEntry?.trend ?? 0,
      deprecation: listPackage.deprecation,
    };
  });
}

export function buildCatalogSearchIndexItems(items: CatalogBootstrapPackage[]): CatalogSearchIndexItem[] {
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

function resolveOptionalAssetPath(baseUrl: string, path: string | undefined): string {
  const trimmed = typeof path === 'string' ? path.trim() : '';
  if (!trimmed) {
    return '';
  }
  return isUrlLike(trimmed) ? trimmed : resolveUrl(baseUrl, trimmed);
}
