import { splitPackageId } from './packageId';
import { ensureDirectoryUrl, isUrlLike, joinPath, resolveUrl } from './pathUtils';

export interface SourcePackagePathSet {
  packageBasePath: string;
  metaPath: string;
  installPath: string;
  versionsPath: string;
  contentPath: string;
  docsPath: string;
  changelogPath: string;
  noticePath: string;
  imagesDirPath: string;
}

export function resolveSourcePackageBasePath(sourcePackagesRoot: string, packageId: string): string {
  const parts = splitPackageId(packageId);
  if (!parts) {
    throw new Error(`invalid package id: ${packageId}`);
  }

  if (isUrlLike(sourcePackagesRoot)) {
    return resolveUrl(ensureDirectoryUrl(sourcePackagesRoot), `${parts.namespace}/${parts.packageSlug}/`);
  }

  return joinPath(sourcePackagesRoot, parts.namespace, parts.packageSlug);
}

export function resolveSourcePackagePaths(
  sourcePackagesRoot: string,
  packageId: string,
  locale: string,
): SourcePackagePathSet {
  const packageBasePath = resolveSourcePackageBasePath(sourcePackagesRoot, packageId);
  const contentPath = isUrlLike(packageBasePath)
    ? resolveUrl(packageBasePath, `content/${locale}.json`)
    : joinPath(packageBasePath, 'content', `${locale}.json`);
  const docsPath = isUrlLike(packageBasePath)
    ? resolveUrl(packageBasePath, `docs/${locale}.md`)
    : joinPath(packageBasePath, 'docs', `${locale}.md`);
  const changelogPath = isUrlLike(packageBasePath)
    ? resolveUrl(packageBasePath, `changelog/${locale}.md`)
    : joinPath(packageBasePath, 'changelog', `${locale}.md`);
  const noticePath = isUrlLike(packageBasePath)
    ? resolveUrl(packageBasePath, `notice/${locale}.md`)
    : joinPath(packageBasePath, 'notice', `${locale}.md`);
  const imagesDirPath = isUrlLike(packageBasePath)
    ? resolveUrl(packageBasePath, 'images/')
    : joinPath(packageBasePath, 'images');

  return {
    packageBasePath,
    metaPath: isUrlLike(packageBasePath)
      ? resolveUrl(packageBasePath, 'meta.json')
      : joinPath(packageBasePath, 'meta.json'),
    installPath: isUrlLike(packageBasePath)
      ? resolveUrl(packageBasePath, 'install.json')
      : joinPath(packageBasePath, 'install.json'),
    versionsPath: isUrlLike(packageBasePath)
      ? resolveUrl(packageBasePath, 'versions.json')
      : joinPath(packageBasePath, 'versions.json'),
    contentPath,
    docsPath,
    changelogPath,
    noticePath,
    imagesDirPath,
  };
}
