export function isMarkdownFilePath(path: unknown): path is string {
  if (typeof path !== 'string') return false;
  const trimmedPath = path.trim();
  if (!trimmedPath || trimmedPath.includes('\n')) return false;
  return /\.md$/i.test(trimmedPath);
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

export function errorMessage(error: unknown): string {
  if (error instanceof Error && error.message) return error.message;
  if (typeof error === 'string' && error) return error;
  try {
    return String(error);
  } catch {
    return '原因不明のエラー';
  }
}

export function readFromSearch(state: unknown): string {
  if (!state || typeof state !== 'object') return '';
  const value = (state as Record<string, unknown>).fromSearch;
  return typeof value === 'string' ? value : '';
}

export function shouldOpenExternalLink(href: string): boolean {
  const trimmed = String(href || '').trim();
  if (!trimmed) return false;
  if (trimmed.startsWith('#')) return false;
  if (/^javascript:/i.test(trimmed)) return false;
  return true;
}
