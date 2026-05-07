export function isWindowsAbsolutePath(value: string): boolean {
  return /^[A-Za-z]:[\\/]/.test(value);
}

export function isUrlLike(value: string): boolean {
  return /^[a-zA-Z][a-zA-Z\d+.-]*:/.test(value) && !isWindowsAbsolutePath(value);
}

export function trimTrailingSeparators(value: string, separator: string): string {
  let next = value;
  while (next.endsWith(separator)) {
    next = next.slice(0, -1);
  }
  return next;
}

export function joinPath(base: string, ...segments: string[]): string {
  const separator = isWindowsAbsolutePath(base) || base.includes('\\') ? '\\' : '/';
  const normalizedBase = trimTrailingSeparators(base, separator);
  const normalizedSegments = segments
    .map((segment) => segment.replace(/[\\/]+/g, separator))
    .map((segment) => segment.replace(new RegExp(`^\\${separator}+|\\${separator}+$`, 'g'), ''))
    .filter(Boolean);
  return [normalizedBase, ...normalizedSegments].join(separator);
}

export function normalizeLocalPathSegments(path: string): string {
  const separator = isWindowsAbsolutePath(path) || path.includes('\\') ? '\\' : '/';
  const normalized = path.replace(/[\\/]+/g, separator);
  const drivePrefix = separator === '\\' ? normalized.match(/^[A-Za-z]:\\?/)?.[0] || '' : '';
  const rootPrefix = !drivePrefix && normalized.startsWith(separator) ? separator : '';
  const prefix = drivePrefix || rootPrefix;
  const rest = prefix ? normalized.slice(prefix.length) : normalized;
  const parts: string[] = [];

  for (const part of rest.split(separator)) {
    if (!part || part === '.') {
      continue;
    }
    if (part === '..') {
      if (parts.length > 0 && parts[parts.length - 1] !== '..') {
        parts.pop();
      } else if (!prefix) {
        parts.push(part);
      }
      continue;
    }
    parts.push(part);
  }

  const normalizedPrefix = drivePrefix ? drivePrefix.replace(/[\\/]?$/, separator) : rootPrefix;
  return `${normalizedPrefix}${parts.join(separator)}` || '.';
}

export function dirnamePath(path: string): string {
  const normalized = path.replace(/\//g, '\\');
  const lastBackslashIndex = normalized.lastIndexOf('\\');
  if (lastBackslashIndex >= 0) {
    return normalized.slice(0, lastBackslashIndex);
  }
  const lastSlashIndex = path.lastIndexOf('/');
  return lastSlashIndex >= 0 ? path.slice(0, lastSlashIndex) : '';
}

export function resolvePathOrUrl(basePathOrUrl: string, relativePathOrUrl: string): string {
  if (isUrlLike(relativePathOrUrl)) {
    return relativePathOrUrl;
  }
  if (!basePathOrUrl || isWindowsAbsolutePath(relativePathOrUrl)) {
    return relativePathOrUrl;
  }
  return isUrlLike(basePathOrUrl)
    ? resolveUrl(basePathOrUrl, relativePathOrUrl)
    : joinPath(basePathOrUrl, relativePathOrUrl);
}

export function resolveLocalAssetBasePath(path: string): string {
  const dirname = dirnamePath(path);
  const basename = path.replace(/\\/g, '/').split('/').pop() || '';
  if (dirname && /\.[^./\\]+$/.test(basename)) {
    return dirname;
  }
  if (!dirname && /\.[^./\\]+$/.test(basename)) {
    return '';
  }
  return path;
}

export function resolveMarkdownAssetPath(basePathOrUrl: string, relativePathOrUrl: string): string {
  const base = isUrlLike(basePathOrUrl) ? basePathOrUrl : resolveLocalAssetBasePath(basePathOrUrl);
  return resolvePathOrUrl(base, relativePathOrUrl);
}

export function resolveUrl(baseUrl: string, relativePath: string): string {
  return new URL(relativePath, baseUrl).toString();
}

export function ensureDirectoryUrl(baseUrl: string): string {
  const normalized = new URL(baseUrl);
  if (!normalized.pathname.endsWith('/')) {
    normalized.pathname = `${normalized.pathname}/`;
  }
  return normalized.toString();
}
