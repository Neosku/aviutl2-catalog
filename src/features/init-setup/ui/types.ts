import type { InitSetupStep, InstalledChoice, PackageVersionsMap, RequiredPackageRow } from '../model/types';

export interface StepIndicatorProps {
  step: InitSetupStep;
  installed: InstalledChoice;
}

export interface IntroSectionProps {
  canStart: boolean;
  onStart: () => void;
}

export interface InstallStatusSectionProps {
  onSelectInstalled: (choice: boolean) => void;
  onBack: () => void;
}

export interface ExistingDetailsSectionProps {
  aviutlRoot: string;
  portable: boolean;
  savingInstallDetails: boolean;
  canProceed: boolean;
  onAviutlRootChange: (value: string) => void;
  onPortableChange: (portable: boolean) => void;
  onPickExistingDir: () => void;
  onBack: () => void;
  onNext: () => void;
}

export interface InstallDetailsSectionProps {
  installDir: string;
  portable: boolean;
  savingInstallDetails: boolean;
  canProceed: boolean;
  coreProgressRatio: number;
  onInstallDirChange: (value: string) => void;
  onPortableChange: (portable: boolean) => void;
  onPickInstallDir: () => void;
  onBack: () => void;
  onNext: () => void;
}

export interface PackagesSectionProps {
  requiredPackages: RequiredPackageRow[];
  packageVersions: PackageVersionsMap;
  allRequiredInstalled: boolean;
  packagesLoading: boolean;
  packagesError: string;
  packagesDownloadError: string;
  bulkDownloading: boolean;
  onBack: () => void;
  onSkip: () => void;
  onInstallAndNext: () => void;
}

export interface DoneSectionProps {
  busy: boolean;
  onFinalize: () => void;
  onBack: () => void;
}
