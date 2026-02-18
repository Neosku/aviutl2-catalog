export interface SettingsFormState {
  aviutl2Root: string;
  isPortableMode: boolean;
  theme: string;
  packageStateOptOut: boolean;
}

export type InstalledImportMap = Record<string, string>;
