import { i18n } from '@/i18n';
import { MISSING_DETECT_RESULT, type DetectResult } from '../detectResult';
import { formatUnknownError } from '../errors';
import { detectInstalledVersionsMap } from '../installed-map';
import { logInfo } from '../logging';
import { deletePath, ensureAbsolutePath, expandMacros, expandRunArgs, runInstallerExecutable } from './runtime';
import { emitTestOperation } from './shape';
import type {
  CatalogDispatchFn,
  InstallerAction,
  InstallerMacroContext,
  InstallerRunnableItem,
  StepOperationTarget,
} from './types';

export async function syncDetectedVersionWithDispatch(
  item: InstallerRunnableItem,
  dispatch: CatalogDispatchFn,
): Promise<DetectResult> {
  if (!dispatch) return MISSING_DETECT_RESULT;
  const map = await detectInstalledVersionsMap([item]);
  const result = map[item.id] ?? MISSING_DETECT_RESULT;
  dispatch({ type: 'SET_DETECTED_ONE', payload: { id: item.id, result } });
  return result;
}

export async function executeDeleteAction(params: {
  logPrefix: 'installer' | 'uninstall';
  itemId: string;
  pathValue: string;
  ctx: InstallerMacroContext;
  pathLabel: string;
  stepOperation: StepOperationTarget;
  onOperation?: (operation: Record<string, unknown>) => void;
}): Promise<void> {
  const { logPrefix, itemId, pathValue, ctx, pathLabel, stepOperation, onOperation } = params;
  const expandedPath = await expandMacros(pathValue, ctx);
  try {
    const abs = ensureAbsolutePath(expandedPath, pathLabel);
    stepOperation.targetPath = abs;
    const ok = await deletePath(abs);
    if (ok) {
      await logInfo(`[${logPrefix} ${itemId}] delete ok path="${expandedPath}"`);
      emitTestOperation(onOperation, {
        kind: stepOperation.kind,
        status: 'done',
        summary: stepOperation.summary,
        detail: '',
        targetPath: stepOperation.targetPath,
      });
      return;
    }
    await logInfo(`[${logPrefix} ${itemId}] delete skip (not found) path="${expandedPath}"`);
    emitTestOperation(onOperation, {
      kind: stepOperation.kind,
      status: 'skip',
      summary: i18n.t('register:tests.deleteSkipped'),
      detail: i18n.t('register:tests.deleteSkippedDetail'),
      targetPath: stepOperation.targetPath,
    });
  } catch (e: unknown) {
    throw new Error(`delete failed path=${expandedPath}: ${formatUnknownError(e)}`, { cause: e });
  }
}

export async function executeRunAction(params: {
  step: Extract<InstallerAction, { action: 'run' }>;
  ctx: InstallerMacroContext;
  pathLabel: string;
  stepOperation: StepOperationTarget;
  onOperation?: (operation: Record<string, unknown>) => void;
}): Promise<void> {
  const { step, ctx, pathLabel, stepOperation, onOperation } = params;
  const executablePath = ensureAbsolutePath(await expandMacros(step.path, ctx), pathLabel);
  stepOperation.targetPath = executablePath;
  const expandedArgs = await expandRunArgs(step.args ?? [], ctx);
  await runInstallerExecutable(executablePath, expandedArgs, !!step.elevate);
  emitTestOperation(onOperation, {
    kind: stepOperation.kind,
    status: 'done',
    summary: stepOperation.summary,
    detail: '',
    targetPath: stepOperation.targetPath,
  });
}
