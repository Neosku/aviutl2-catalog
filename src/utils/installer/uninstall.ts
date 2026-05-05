import { i18n } from '@/i18n';
import { assertNever, formatUnknownError } from '../errors';
import { removeInstalledId } from '../installed-map';
import { bestEffortLogError, logInfo } from '../logging';
import { recordPackageStateEvent } from '../package-state';
import { executeDeleteAction, executeRunAction, syncDetectedVersionWithDispatch } from './actions';
import { ensureAviutlClosed, ensureTmpDir } from './runtime';
import { emitTestOperation, normalizeInstallerConfig, toTestOperationKind, toTestOperationLabel } from './shape';
import type { CatalogDispatchFn, InstallerRunnableItem, TestOperationKind } from './types';

export async function runUninstallerForItem(
  item: InstallerRunnableItem,
  dispatch: CatalogDispatchFn,
  onOperation?: (operation: Record<string, unknown>) => void,
): Promise<void> {
  await ensureAviutlClosed();
  const version = typeof item.latestVersion === 'string' ? item.latestVersion : '';
  const idVersion = `${item.id}-${version || 'latest'}`.replace(/[^A-Za-z0-9._-]/g, '_');
  const tmpDir = await ensureTmpDir(idVersion);
  const installer = normalizeInstallerConfig(item.installer);
  const ctx = {
    tmpDir: tmpDir,
    downloadPath: '',
  };
  const uninstallSteps = installer.uninstallSteps;
  try {
    await logInfo(`[uninstall ${item.id}] start steps=${uninstallSteps.length}`);
    for (let i = 0; i < uninstallSteps.length; i++) {
      const step = uninstallSteps[i];
      const stepAction = step.action;
      const stepOperation: {
        kind: TestOperationKind;
        summary: string;
        targetPath?: string;
      } = {
        kind: toTestOperationKind(stepAction),
        summary: toTestOperationLabel(stepAction),
      };
      try {
        switch (stepAction) {
          case 'delete': {
            await executeDeleteAction({
              logPrefix: 'uninstall',
              itemId: item.id,
              pathValue: step.path,
              ctx,
              pathLabel: 'uninstall.delete.path',
              stepOperation,
              onOperation,
            });
            break;
          }
          case 'run': {
            await executeRunAction({
              step,
              ctx,
              pathLabel: 'uninstall.run.path',
              stepOperation,
              onOperation,
            });
            break;
          }
          default:
            assertNever(stepAction);
        }
      } catch (e: unknown) {
        const msg = `[uninstall ${item.id}] step ${i + 1}/${uninstallSteps.length} action=${stepAction} failed: ${formatUnknownError(e)}`;
        emitTestOperation(onOperation, {
          kind: stepOperation.kind,
          status: 'error',
          summary: i18n.t('register:tests.operationFailed', { action: toTestOperationLabel(stepAction) }),
          detail: formatUnknownError(e),
          targetPath: stepOperation.targetPath,
        });
        await bestEffortLogError(msg);
        throw new Error(msg, { cause: e });
      }
    }
  } catch (e: unknown) {
    const detail = formatUnknownError(e);
    await bestEffortLogError(`[uninstall ${item.id}] error: ${detail}`);
    throw e;
  }
  await removeInstalledId(item.id);
  await syncDetectedVersionWithDispatch(item, dispatch);
  try {
    await recordPackageStateEvent('uninstall', item.id);
  } catch (e: unknown) {
    await bestEffortLogError(`[uninstall ${item.id}] record package-state failed: ${formatUnknownError(e)}`);
  }
  await logInfo(`[uninstall ${item.id}] completed`);
}
