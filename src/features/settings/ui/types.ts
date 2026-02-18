import type React from 'react';
import type { SettingsFormState } from '../model/types';

export interface AppSettingsSectionProps {
  form: SettingsFormState;
  packageStateEnabled: boolean;
  saving: boolean;
  success: string;
  onAviutl2RootChange: (event: React.ChangeEvent<HTMLInputElement>) => void;
  onPortableToggle: (next: boolean) => void;
  onPackageStateEnabledToggle: (nextEnabled: boolean) => void;
  onPickAviutl2Root: () => void;
  onToggleTheme: () => void;
  onSave: () => void;
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
