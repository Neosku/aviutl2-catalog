import type { ChangeEvent } from 'react';
import type { SettingsFormState } from '../model/types';

export interface AppSettingsSectionProps {
  form: SettingsFormState;
  packageStateEnabled: boolean;
  onAviutl2RootChange: (event: ChangeEvent<HTMLInputElement>) => void;
  onLocaleChange: (event: ChangeEvent<HTMLSelectElement>) => void;
  onPortableToggle: (next: boolean) => void;
  onPackageStateEnabledToggle: (nextEnabled: boolean) => void;
  onPickAviutl2Root: () => void;
  onToggleTheme: () => void;
}

export interface MaintainerSettingsSectionProps {
  form: SettingsFormState;
  onLocalModeToggle: (next: boolean) => void;
  onLocalManifestPathChange: (event: ChangeEvent<HTMLInputElement>) => void;
  onPickLocalManifest: () => void;
}

export interface DataManagementSectionProps {
  syncBusy: boolean;
  syncStatus: string;
  onExport: () => void;
  onImport: () => void;
}

export interface AppInfoSectionProps {
  appVersion: string;
}
