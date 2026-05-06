import { normalizeUiLocale, type SupportedUiLocale } from '@/i18n/uiLocale';
import { ipc } from './invokeIpc';
import { getSettings, type AppSettings } from './settings';

export const DEFAULT_APP_THEME = 'darkmode';

export interface AppSettingsDraft {
  aviutl2Root?: string | null;
  isPortableMode?: boolean | null;
  theme?: string | null;
  locale?: string | null;
  packageStateOptOut?: boolean | null;
  localModeEnabled?: boolean | null;
  localManifestPath?: string | null;
}

interface UpdateAppSettingsPayload {
  aviutl2Root: string;
  isPortableMode: boolean;
  theme: string;
  locale: SupportedUiLocale;
  packageStateOptOut: boolean;
  localModeEnabled: boolean;
  localManifestPath: string;
}

export function normalizeTheme(value: unknown): string {
  return String(value || '').trim() === 'lightmode' ? 'lightmode' : DEFAULT_APP_THEME;
}

export function resolveAppSettingsUpdate(
  draft: AppSettingsDraft,
  persisted: AppSettings = {},
): UpdateAppSettingsPayload | null {
  const aviutl2Root = String(draft.aviutl2Root ?? persisted.aviutl2_root ?? '').trim();
  if (!aviutl2Root) return null;

  return {
    aviutl2Root,
    isPortableMode: Boolean(draft.isPortableMode ?? persisted.is_portable_mode),
    theme: normalizeTheme(draft.theme ?? persisted.theme),
    locale: normalizeUiLocale(draft.locale ?? persisted.locale),
    packageStateOptOut: Boolean(draft.packageStateOptOut ?? persisted.package_state_opt_out),
    localModeEnabled: Boolean(draft.localModeEnabled ?? persisted.local_mode_enabled),
    localManifestPath: String(draft.localManifestPath ?? persisted.local_manifest_path ?? '').trim(),
  };
}

export async function updateAppSettings(draft: AppSettingsDraft): Promise<boolean> {
  const payload = resolveAppSettingsUpdate(draft, await getSettings());
  if (!payload) return false;
  await ipc.updateSettings(payload);
  return true;
}
