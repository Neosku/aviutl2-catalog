/**
 * register UI 層で共有する型定義
 */
import type { FormEvent, MouseEventHandler, PointerEvent } from 'react';
import type { CatalogEntry } from '../../../utils/catalogSchema.js';
import type {
  RegisterImageState,
  RegisterInstallerOption,
  RegisterInstallerState,
  RegisterInstallerTestItem,
  RegisterLicense,
  RegisterPackageForm,
  RegisterVersion,
  RegisterVersionFile,
} from '../model/types';

export type RegisterStepType = 'install' | 'uninstall';
export interface RefCell<T> {
  current: T;
}

export interface InstallerTestProgress {
  ratio: number;
  percent: number;
  label: string;
  phase: string;
}

export type RegisterTestOperationKind = 'download' | 'extract' | 'extract_sfx' | 'copy' | 'delete' | 'run' | 'error';
export type RegisterTestOperationStatus = 'done' | 'skip' | 'error';

export interface RegisterTestOperation {
  key: string;
  kind: RegisterTestOperationKind;
  status: RegisterTestOperationStatus;
  summary: string;
  detail: string;
  fromPath?: string;
  toPath?: string;
  targetPath?: string;
}

export interface SubmitPackagePayload {
  action: string;
  title: string;
  packageId: string;
  packageName: string;
  packageAuthor: string;
  labels: string[];
  sender?: string;
}

export interface SubmitEndpointResponse {
  error?: string;
  message?: string;
  detail?: string;
  pr_url?: string;
  public_issue_url?: string;
  url?: string;
}

export type InstallerTestItem = RegisterInstallerTestItem;

export interface ActionDropdownProps {
  value: string;
  onChange?: (value: string) => void;
  options: RegisterInstallerOption[];
  ariaLabel?: string;
  buttonId?: string;
  ariaLabelledby?: string;
}

export interface DeleteButtonProps {
  onClick?: MouseEventHandler<HTMLButtonElement>;
  ariaLabel?: string;
  title?: string;
}

export interface TagEditorProps {
  initialTags: string[];
  suggestions?: string[];
  onChange?: (next: string[]) => void;
}

export interface PackageLicenseSectionProps {
  license?: RegisterLicense;
  onUpdateLicenseField: (key: string, field: string, value: string | boolean) => void;
  onToggleTemplate: (key: string, useTemplate: boolean) => void;
  onUpdateCopyright: (licenseKey: string, copyrightKey: string, field: string, value: string) => void;
}

export interface PackageImagesSectionProps {
  images: RegisterImageState;
  packageId: string;
  onThumbnailChange: (file: RegisterSelectedImageInput) => void;
  onRemoveThumbnail: () => void;
  onAddInfoImages: (files: RegisterSelectedImageInput[]) => void;
  onRemoveInfoImage: (key: string) => void;
}

export interface RegisterSelectedImageInput {
  file: File;
  sourcePath?: string;
}

export interface PackageInstallerSectionProps {
  installer: RegisterInstallerState;
  installListRef: RefCell<HTMLDivElement | null>;
  uninstallListRef: RefCell<HTMLDivElement | null>;
  addInstallStep: () => void;
  addUninstallStep: () => void;
  removeInstallStep: (key: string) => void;
  removeUninstallStep: (key: string) => void;
  startHandleDrag: (type: RegisterStepType, index: number, event: PointerEvent<HTMLButtonElement>) => void;
  updateInstallStep: (key: string, field: string, value: string | boolean) => void;
  updateInstallerField: (field: string, value: string) => void;
  updateUninstallStep: (key: string, field: string, value: string | boolean) => void;
}

export interface VersionFileCardProps {
  versionKey: string;
  file: RegisterVersionFile;
  index: number;
  removeVersionFile: (versionKey: string, fileKey: string) => void;
  updateVersionFile: (versionKey: string, fileKey: string, field: string, value: string) => void;
  chooseFileForHash: (versionKey: string, fileKey: string) => void;
}

export interface VersionItemProps {
  version: RegisterVersion;
  isOpen: boolean;
  toggleVersionOpen: (key: string, open: boolean) => void;
  removeVersion: (key: string) => void;
  updateVersionField: (key: string, field: string, value: string) => void;
  addVersionFile: (versionKey: string) => void;
  removeVersionFile: (versionKey: string, fileKey: string) => void;
  updateVersionFile: (versionKey: string, fileKey: string, field: string, value: string) => void;
  chooseFileForHash: (versionKey: string, fileKey: string) => void;
  openDatePicker: (key: string) => void;
  versionDateRefs: RefCell<Map<string, HTMLInputElement>>;
}

export interface PackageVersionSectionProps {
  versions: RegisterVersion[];
  expandedVersionKeys: Set<string>;
  toggleVersionOpen: (key: string, open: boolean) => void;
  removeVersion: (key: string) => void;
  updateVersionField: (key: string, field: string, value: string) => void;
  addVersion: () => void;
  addVersionFile: (versionKey: string) => void;
  removeVersionFile: (versionKey: string, fileKey: string) => void;
  updateVersionFile: (versionKey: string, fileKey: string, field: string, value: string) => void;
  chooseFileForHash: (versionKey: string, fileKey: string) => void;
  openDatePicker: (key: string) => void;
  versionDateRefs: RefCell<Map<string, HTMLInputElement>>;
}

export interface DragHandleState {
  active: boolean;
  type: RegisterStepType | '';
  index: number;
  origin?: HTMLElement;
  floating?: HTMLElement;
  placeholder?: HTMLElement;
  container?: HTMLDivElement;
  offsetX?: number;
  offsetY?: number;
  handle?: HTMLElement | null;
  pointerId?: number;
}

export interface RegisterSuccessDialogState {
  open: boolean;
  message: string;
  url: string;
  packageName: string;
  packageAction: string;
  packageId: string;
}

export interface RegisterSuccessDialogProps {
  dialog: RegisterSuccessDialogState;
  primaryText: string;
  supportText: string;
  onClose: () => void;
}

export interface RegisterSidebarProps {
  packageSearch: string;
  catalogLoadState: 'idle' | 'loading' | 'loaded' | 'error';
  filteredPackages: CatalogEntry[];
  draftPackages: RegisterDraftListItemView[];
  selectedPackageId: string;
  onPackageSearchChange: (value: string) => void;
  onSelectPackage: (item: CatalogEntry | null) => void;
  onStartNewPackage: () => void;
  onOpenDraftPackage: (draftId: string) => void;
  onDeleteDraftPackage: (draftId: string) => void;
}

export interface RegisterDraftListItemView {
  draftId: string;
  packageId: string;
  packageName: string;
  savedAt: number;
  pending: boolean;
  readyForSubmit: boolean;
  lastSubmitError: string;
}

export interface RegisterMetaSectionProps {
  packageForm: RegisterPackageForm;
  initialTags: string[];
  tagCandidates: string[];
  onUpdatePackageField: (field: keyof RegisterPackageForm, value: any) => void;
  onTagsChange: (list: string[]) => void;
}

export interface RegisterDescriptionSectionProps {
  packageForm: RegisterPackageForm;
  descriptionTab: string;
  descriptionLoading: boolean;
  descriptionPreviewHtml: string;
  isExternalDescription: boolean;
  hasExternalDescriptionUrl: boolean;
  isExternalDescriptionLoaded: boolean;
  externalDescriptionStatus: string;
  onUpdatePackageField: (field: keyof RegisterPackageForm, value: any) => void;
  onSetDescriptionTab: (tab: string) => void;
}

export interface RegisterPreviewSectionProps {
  packageForm: RegisterPackageForm;
  currentTags: string[];
  previewDarkMode: boolean;
  onTogglePreviewDarkMode: () => void;
}

export interface RegisterTestSectionProps {
  installerTestRunning: boolean;
  installerTestValidation: string;
  installerTestRatio: number;
  installerTestPhase: string;
  installerTestTone: string;
  installerTestLabel: string;
  installerTestPercent: number;
  installerTestDetectedVersion: string;
  installerTestError: string;
  uninstallerTestRunning: boolean;
  uninstallerTestValidation: string;
  uninstallerTestRatio: number;
  uninstallerTestPhase: string;
  uninstallerTestTone: string;
  uninstallerTestLabel: string;
  uninstallerTestPercent: number;
  uninstallerTestError: string;
  installerTestOperations: RegisterTestOperation[];
  uninstallerTestOperations: RegisterTestOperation[];
  onInstallerTest: () => void;
  onUninstallerTest: () => void;
}

export interface RegisterSubmitBarProps {
  packageGuideUrl: string;
  packageSender: string;
  submitting: boolean;
  pendingSubmitCount: number;
  blockedSubmitCount: number;
  submittingLabel?: string;
  onPackageSenderChange: (value: string) => void;
  onOpenJsonImport: () => void;
}

export interface RegisterFormLayoutProps {
  error: string;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  sidebar: RegisterSidebarProps;
  meta: RegisterMetaSectionProps;
  description: RegisterDescriptionSectionProps;
  license: PackageLicenseSectionProps;
  images: PackageImagesSectionProps;
  installer: PackageInstallerSectionProps;
  versions: PackageVersionSectionProps;
  preview: RegisterPreviewSectionProps;
  tests: RegisterTestSectionProps;
  submitBar: RegisterSubmitBarProps;
}
