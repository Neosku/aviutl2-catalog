import type { InstallerAction, InstallerSource } from '../catalogSchema';

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
  install: InstallerAction[];
  uninstall: InstallerAction[];
};

export type InstallerRunnableItem = {
  id: string;
  installer?: unknown;
  'latest-version'?: unknown;
};

export type SetDetectedOneAction = {
  type: 'SET_DETECTED_ONE';
  payload: { id: string; version: string };
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

export type TestOperationKind = 'download' | 'extract' | 'extract_sfx' | 'copy' | 'delete' | 'run' | 'error';

export type StepOperationTarget = {
  kind: TestOperationKind;
  summary: string;
  targetPath?: string;
};
