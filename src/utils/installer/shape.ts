import { i18n } from '@/i18n';
import {
  installationSourceSchema,
  installStepSchema,
  uninstallStepSchema,
} from '../catalog-schema/shared/installationSchema';
import type { Installer, InstallerRunnableItem, InstallerSource } from './types';
import type { InstallerConfigLike, TestOperationKind } from './types';

const TEST_OPERATION_LABEL_KEYS: Record<string, string> = {
  download: 'register:installer.actions.download',
  extract: 'register:tests.kind.extract',
  extractSfx: 'register:tests.kind.extractSfx',
  copy: 'register:installer.actions.copy',
  delete: 'register:installer.actions.delete',
  run: 'register:tests.kind.run',
  runAuoSetup: 'register:tests.kind.run',
};

export function hasInstaller(item: unknown): item is InstallerRunnableItem & { installer: Installer } {
  if (!item || typeof item !== 'object') return false;
  const candidate = item as { installer?: unknown };
  if (typeof candidate.installer !== 'object') return false;
  const installer = candidate.installer as { installSteps?: unknown };
  return Array.isArray(installer.installSteps);
}

export function toTestOperationKind(action: unknown): TestOperationKind {
  const value = String(action || '');
  if (value === 'download') return 'download';
  if (value === 'extract') return 'extract';
  if (value === 'extractSfx') return 'extractSfx';
  if (value === 'copy') return 'copy';
  if (value === 'delete') return 'delete';
  if (value === 'run' || value === 'runAuoSetup') return 'run';
  return 'error';
}

export function toTestOperationLabel(action: unknown): string {
  const value = String(action || '');
  return TEST_OPERATION_LABEL_KEYS[value]
    ? i18n.t(TEST_OPERATION_LABEL_KEYS[value])
    : value || i18n.t('common:status.processing');
}

export function emitTestOperation(
  onOperation: ((operation: Record<string, unknown>) => void) | undefined,
  operation: Record<string, unknown>,
): void {
  if (typeof onOperation !== 'function' || !operation || typeof operation !== 'object') return;
  try {
    onOperation(operation);
  } catch {}
}

function normalizeInstallerSource(raw: unknown): InstallerSource | undefined {
  if (raw == null) return undefined;
  const parsed = installationSourceSchema.safeParse(raw);
  if (!parsed.success) {
    throw new Error('installer.source is invalid');
  }
  return parsed.data;
}

function normalizeInstallSteps(raw: unknown): InstallerConfigLike['installSteps'] {
  if (!Array.isArray(raw)) return [];
  return raw.map((step, index) => {
    const parsed = installStepSchema.safeParse(step);
    if (!parsed.success) {
      throw new Error(`installer.installSteps[${index}] is invalid`);
    }
    return parsed.data;
  });
}

function normalizeUninstallSteps(raw: unknown): InstallerConfigLike['uninstallSteps'] {
  if (!Array.isArray(raw)) return [];
  return raw.map((step, index) => {
    const parsed = uninstallStepSchema.safeParse(step);
    if (!parsed.success) {
      throw new Error(`installer.uninstallSteps[${index}] is invalid`);
    }
    return parsed.data;
  });
}

export function normalizeInstallerConfig(raw: unknown): InstallerConfigLike {
  if (!raw || typeof raw !== 'object') {
    return { installSteps: [], uninstallSteps: [] };
  }
  const installer = raw as Record<string, unknown>;
  return {
    source: normalizeInstallerSource(installer.source),
    installSteps: normalizeInstallSteps(installer.installSteps),
    uninstallSteps: normalizeUninstallSteps(installer.uninstallSteps),
  };
}
