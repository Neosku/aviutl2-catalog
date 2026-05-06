import * as z from 'zod';
import { normalizeUiLocale, type SupportedUiLocale } from '@/i18n';
import { i18n } from '@/i18n';
import { DEFAULT_APP_THEME, normalizeTheme } from '@/utils/appSettings';
import type { InstalledImportMap, SettingsFormState } from './types';

const installedImportSchema = z.union([z.array(z.string()), z.record(z.string(), z.string())]);
const persistedSettingsSchema = z.object({
  theme: z.string().optional(),
  locale: z.string().optional(),
  aviutl2_root: z.string().optional(),
  is_portable_mode: z.boolean().optional(),
  package_state_opt_out: z.boolean().optional(),
});

export function applyTheme(theme: string): void {
  const root = document?.documentElement;
  if (!root) return;
  const value = String(theme || '').trim();
  const isDark = value !== 'lightmode';
  root.classList.toggle('dark', isDark);
  localStorage.setItem('theme', value);
}

export function toSettingsForm(raw: unknown, fallbackLocale: SupportedUiLocale = 'ja'): SettingsFormState {
  const parsed = persistedSettingsSchema.safeParse(raw);
  const source = parsed.success ? parsed.data : {};
  return {
    theme: normalizeTheme(source.theme ?? DEFAULT_APP_THEME),
    locale: source.locale ? normalizeUiLocale(source.locale) : fallbackLocale,
    aviutl2Root: String(source.aviutl2_root || ''),
    isPortableMode: Boolean(source.is_portable_mode),
    packageStateOptOut: Boolean(source.package_state_opt_out),
  };
}

export function normalizeInstalledImport(data: unknown): InstalledImportMap {
  const parsed = installedImportSchema.safeParse(data);
  if (!parsed.success) {
    throw new Error(i18n.t('settings:dataManagement.errors.invalidImportFormat'));
  }
  const normalized = parsed.data;

  if (Array.isArray(normalized)) {
    const out: InstalledImportMap = {};
    normalized.forEach((id) => {
      const key = String(id || '').trim();
      if (key) out[key] = '';
    });
    return out;
  }

  const out: InstalledImportMap = {};
  for (const [rawKey, rawValue] of Object.entries(normalized)) {
    const key = String(rawKey || '').trim();
    if (!key) continue;
    out[key] = rawValue;
  }
  return out;
}

export function toErrorMessage(error: unknown, fallback: string): string {
  if (error instanceof Error && error.message) return error.message;
  if (typeof error === 'string' && error.trim()) return error;
  return fallback;
}
