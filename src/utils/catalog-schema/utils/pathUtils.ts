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
