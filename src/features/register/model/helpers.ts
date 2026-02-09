/**
 * 登録画面専用のユーティリティ群モジュール
 */
import type { RegisterImageState, RegisterPackageForm } from './types';

export function generateKey(): string {
  return Math.random().toString(36).slice(2, 10);
}

export function normalizeArrayText(values: unknown[] = []): string[] {
  return (Array.isArray(values) ? values : []).map((v) => String(v || '').trim()).filter(Boolean);
}

export function commaListToArray(text: string): string[] {
  return String(text || '')
    .split(',')
    .map((v) => v.trim())
    .filter(Boolean);
}

export function arrayToCommaList(arr: unknown[]): string {
  return normalizeArrayText(Array.isArray(arr) ? arr : []).join(', ');
}

export function isMarkdownPath(value: unknown): boolean {
  return typeof value === 'string' && /\.md$/i.test(value.trim());
}

export function isHttpsUrl(value: unknown): boolean {
  return /^https:\/\//i.test(String(value || '').trim());
}

export function resolveRelativeUrl(rawPath: string, baseUrl: string): string {
  if (!rawPath) return '';
  if (!baseUrl) return rawPath;
  try {
    return new URL(rawPath, baseUrl).toString();
  } catch {
    return rawPath;
  }
}

export function getDescriptionSourceUrl(form: RegisterPackageForm, baseUrl: string): string {
  if (!form || typeof form !== 'object') return '';
  if (form.descriptionMode === 'external') {
    const externalUrl = String(form.descriptionUrl || '').trim();
    return isHttpsUrl(externalUrl) ? externalUrl : '';
  }
  const descriptionPath = String(form.descriptionPath || '').trim();
  if (isMarkdownPath(descriptionPath) && !isHttpsUrl(descriptionPath)) {
    return resolveRelativeUrl(descriptionPath, baseUrl);
  }
  return '';
}

export function buildPreviewUrl(src: string, baseUrl: string): string {
  if (!src) return '';
  if (!baseUrl) return src;
  return resolveRelativeUrl(src, baseUrl);
}

export function revokePreviewUrl(url: string): void {
  if (typeof url === 'string' && url.startsWith('blob:')) {
    try {
      URL.revokeObjectURL(url);
    } catch {
      /* ignore */
    }
  }
}

export function cleanupImagePreviews(images: RegisterImageState | null | undefined): void {
  if (!images) return;
  if (images.thumbnail?.previewUrl) revokePreviewUrl(images.thumbnail.previewUrl);
  if (Array.isArray(images.info)) {
    images.info.forEach((entry) => {
      if (entry?.previewUrl) revokePreviewUrl(entry.previewUrl);
    });
  }
}

export function resolveBaseUrl(rawUrl: string): string | null {
  if (!rawUrl) return null;
  try {
    const absolute = new URL(
      rawUrl,
      (typeof window !== 'undefined' && window.location && window.location.href) || 'app://localhost/',
    );
    return new URL('.', absolute).toString();
  } catch {
    const stripped = String(rawUrl).split(/[?#]/)[0];
    const idx = stripped.lastIndexOf('/');
    if (idx >= 0) {
      return stripped.slice(0, idx + 1);
    }
    return null;
  }
}

export function basename(path: string): string {
  if (typeof path !== 'string') return '';
  const parts = path.split(/[/\\]/);
  return parts[parts.length - 1] || path;
}

export function isInsideRect(rect: DOMRect | null, x: number, y: number): boolean {
  if (!rect) return false;
  return x >= rect.left && x <= rect.right && y >= rect.top && y <= rect.bottom;
}

export function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
