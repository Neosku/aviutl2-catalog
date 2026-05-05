import type { Installation } from '../catalog-schema/shared/installationSchema';
import type { DetectResult } from '../detectResult';

export type Installer = Installation;
export type InstallerSource = Installation['source'];
export type InstallerInstallAction = Installation['installSteps'][number];
export type InstallerUninstallAction = Installation['uninstallSteps'][number];
export type InstallerAction = InstallerInstallAction | InstallerUninstallAction;

export type InstallerMacroContext = {
  tmpDir: string;
  downloadPath?: string;
};

export type DownloadProgress = {
  read: number;
  total: number | null;
};

export type DownloadOptions = {
  onProgress?: (progress: DownloadProgress) => void;
  taskId?: string;
};

export type DownloadEventPayload = {
  taskId?: string;
  fileId?: string;
  read?: number;
  total?: number;
};

export type InstallerConfigLike = {
  source?: InstallerSource;
  installSteps: InstallerInstallAction[];
  uninstallSteps: InstallerUninstallAction[];
};

export type InstallerRunnableItem = {
  id: string;
  installer?: Installer;
  latestVersion?: string;
};

export type SetDetectedOneAction = {
  type: 'SET_DETECTED_ONE';
  payload: { id: string; result: DetectResult; forceLatest?: boolean };
};

export type CatalogDispatchFn = ((action: SetDetectedOneAction) => void) | null | undefined;

export type InstallProgressPhase = 'init' | 'running' | 'step-complete' | 'error' | 'done';

export type InstallProgressPayload = {
  ratio: number;
  percent: number;
  step: string | null;
  stepIndex: number | null;
  totalSteps: number;
  label: string;
  phase: InstallProgressPhase;
};

export type TestOperationKind = 'download' | 'extract' | 'extractSfx' | 'copy' | 'delete' | 'run' | 'error';

export type StepOperationTarget = {
  kind: TestOperationKind;
  summary: string;
  targetPath?: string;
};
