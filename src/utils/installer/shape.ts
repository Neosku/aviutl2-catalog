import { installerActionSchema, installerSourceSchema } from '../catalogSchema';
import type { InstallerAction, InstallerSource } from '../catalogSchema';
import type { InstallerConfigLike, TestOperationKind } from './types';

const TEST_OPERATION_LABELS: Record<string, string> = {
  download: 'ダウンロード',
  extract: '展開',
  extract_sfx: 'SFX展開',
  copy: 'コピー',
  delete: '削除',
  run: '実行',
  run_auo_setup: '実行',
};

export function hasInstaller(item: unknown): boolean {
  if (!item || typeof item !== 'object') return false;
  const candidate = item as { installer?: unknown };
  if (!candidate.installer) return false;
  if (typeof candidate.installer === 'string') return true;
  if (typeof candidate.installer !== 'object') return false;
  const installer = candidate.installer as { install?: unknown };
  return Array.isArray(installer.install);
}

export function toTestOperationKind(action: unknown): TestOperationKind {
  const value = String(action || '');
  if (value === 'download') return 'download';
  if (value === 'extract') return 'extract';
  if (value === 'extract_sfx') return 'extract_sfx';
  if (value === 'copy') return 'copy';
  if (value === 'delete') return 'delete';
  if (value === 'run' || value === 'run_auo_setup') return 'run';
  return 'error';
}

export function toTestOperationLabel(action: unknown): string {
  const value = String(action || '');
  return TEST_OPERATION_LABELS[value] || value || '処理';
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
  const parsed = installerSourceSchema.safeParse(raw);
  if (!parsed.success) {
    throw new Error('installer.source is invalid');
  }
  return parsed.data;
}

function normalizeInstallerSteps(raw: unknown, kind: 'install' | 'uninstall'): InstallerAction[] {
  if (!Array.isArray(raw)) return [];
  return raw.map((step, index) => {
    const parsed = installerActionSchema.safeParse(step);
    if (!parsed.success) {
      throw new Error(`installer.${kind}[${index}] is invalid`);
    }
    return parsed.data;
  });
}

export function normalizeInstallerConfig(raw: unknown): InstallerConfigLike {
  if (!raw || typeof raw !== 'object') {
    return { install: [], uninstall: [] };
  }
  const installer = raw as Record<string, unknown>;
  return {
    source: normalizeInstallerSource(installer.source),
    install: normalizeInstallerSteps(installer.install, 'install'),
    uninstall: normalizeInstallerSteps(installer.uninstall, 'uninstall'),
  };
}
