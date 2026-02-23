import type { InstallerAction } from '../catalogSchema';
import { formatUnknownError } from '../errors';
import { addInstalledId } from '../installed-map';
import { bestEffortLogError, logInfo } from '../logging';
import { recordPackageStateEvent } from '../package-state';
import { syncDetectedVersionWithDispatch } from './actions';
import { createInstallProgressTools } from './install-progress';
import { executeInstallStep } from './install-step';
import { deletePath, ensureAviutlClosed, ensureTmpDir } from './runtime';
import { normalizeInstallerConfig, toTestOperationKind, toTestOperationLabel } from './shape';
import type { CatalogDispatchFn, InstallProgressPayload, InstallerRunnableItem, TestOperationKind } from './types';

type InstallStepOperation = {
  kind: TestOperationKind;
  summary: string;
  fromPath: string;
  toPath: string;
  targetPath: string;
};

export async function runInstallerForItem(
  item: InstallerRunnableItem,
  dispatch: CatalogDispatchFn,
  onProgress?: (progress: InstallProgressPayload) => void,
  onOperation?: (operation: Record<string, unknown>) => void,
): Promise<void> {
  await ensureAviutlClosed();
  const version = typeof item['latest-version'] === 'string' ? item['latest-version'] : '';
  const idVersion = `${item.id}-${version || 'latest'}`.replace(/[^A-Za-z0-9._-]/g, '_');
  const tmpDir = await ensureTmpDir(idVersion);
  const installer = normalizeInstallerConfig(item.installer);
  const ctx = {
    tmpDir: tmpDir,
    downloadPath: '',
  };
  const steps = installer.install || [];

  const { emitProgress, createDownloadProgressReporter } = createInstallProgressTools(steps.length, onProgress);
  emitProgress(0, null, -1, 'init');

  try {
    await logInfo(`[installer ${item.id}] start version=${version || ''} steps=${steps.length}`);

    for (let idx = 0; idx < steps.length; idx++) {
      const step = steps[idx];
      const stepOperation: InstallStepOperation = {
        kind: toTestOperationKind(step.action),
        summary: toTestOperationLabel(step.action),
        fromPath: '',
        toPath: '',
        targetPath: '',
      };
      const runningUnits = idx;
      const reportDownloadProgress = createDownloadProgressReporter(step, idx, runningUnits);
      emitProgress(runningUnits, step, idx, 'running');

      try {
        await executeInstallStep({
          itemId: item.id,
          installerSource: installer.source,
          step: step as InstallerAction,
          tmpDir,
          ctx,
          stepOperation,
          onOperation,
          reportDownloadProgress,
        });
        emitProgress(idx + 1, step, idx, 'step-complete');
      } catch (e: unknown) {
        emitProgress(runningUnits, step, idx, 'error');
        const err = e instanceof Error ? e : new Error(String(e));
        const stepAction = step.action;
        if (typeof onOperation === 'function') {
          try {
            onOperation({
              kind: stepOperation.kind,
              status: 'error',
              summary: `${toTestOperationLabel(stepAction)} 失敗`,
              detail: err.message || String(err),
              fromPath: stepOperation.fromPath,
              toPath: stepOperation.toPath,
              targetPath: stepOperation.targetPath,
            });
          } catch {}
        }
        const prefix = `[installer ${item.id}] step ${idx + 1}/${steps.length} action=${stepAction} failed`;
        await bestEffortLogError(`${prefix}:\n${err.message}\n${err.stack ?? '(no stack)'}`);
        throw new Error(`${prefix}: ${err.message}`, { cause: e });
      }
    }

    await addInstalledId(item.id, version);
    await syncDetectedVersionWithDispatch(item, dispatch);
    try {
      await recordPackageStateEvent('install', item.id);
    } catch (e: unknown) {
      await bestEffortLogError(`[installer ${item.id}] record package-state failed: ${formatUnknownError(e)}`);
    }

    await logInfo(`[installer ${item.id}] completed version=${version || ''}`);
    emitProgress(steps.length, null, null, 'done');
  } catch (e: unknown) {
    const detail = formatUnknownError(e) || 'unknown error';
    await bestEffortLogError(`[installer ${item.id}] error: ${detail}`);
    throw e;
  } finally {
    if (!import.meta.env?.DEV) {
      try {
        await deletePath(ctx.tmpDir);
      } catch (e: unknown) {
        await bestEffortLogError(`[installer ${item.id}] cleanup tmp failed: ${formatUnknownError(e)}`);
      }
    }
    const { closeBoothAuthWindow } = await import('./download');
    await closeBoothAuthWindow();
  }
}
