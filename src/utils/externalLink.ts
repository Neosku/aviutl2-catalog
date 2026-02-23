export function resolveExternalHref(rawHref: unknown): string {
  const trimmed = String(rawHref ?? '').trim();
  if (!trimmed) return '';
  if (trimmed.startsWith('#')) return '';
  if (/^javascript:/i.test(trimmed)) return '';
  try {
    if (/^[a-zA-Z][\w+.-]*:/.test(trimmed)) {
      return new URL(trimmed).toString();
    }
    return new URL(trimmed, window.location.href).toString();
  } catch {
    return trimmed;
  }
}

export function canOpenExternalLink(rawHref: unknown): boolean {
  return resolveExternalHref(rawHref) !== '';
}

export async function openExternalLink(rawHref: unknown): Promise<void> {
  const href = resolveExternalHref(rawHref);
  if (!href) return;
  try {
    const shell = await import('@tauri-apps/plugin-shell');
    if (typeof shell.open === 'function') {
      await shell.open(href);
      return;
    }
  } catch (error: unknown) {
    console.warn('Failed to open link via Tauri shell plugin, falling back to window.open', error);
  }
  try {
    window.open(href, '_blank', 'noopener,noreferrer');
  } catch {
    window.location.href = href;
  }
}
