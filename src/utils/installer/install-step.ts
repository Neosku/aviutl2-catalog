import type { InstallerAction, InstallerSource } from '../catalogSchema.js';
import { assertNever } from '../errors.js';
import { logInfo } from '../logging.js';
import { executeDeleteAction, executeRunAction } from './actions.js';
import { downloadFileFromBoothUrl, downloadFileFromGoogleDrive, downloadFileFromUrl } from './download.js';
import {
  copyPattern,
  ensureAbsolutePath,
  expandMacros,
  extractSevenZipSfx,
  extractZip,
  fetchGitHubURL,
  runAuoSetup,
} from './runtime.js';
import { emitTestOperation } from './shape.js';
import type { DownloadProgress, InstallerMacroContext, StepOperationTarget, TestOperationKind } from './types.js';

type StepOperation = {
  kind: TestOperationKind;
  summary: string;
  fromPath: string;
  toPath: string;
  targetPath: string;
};

type ExecuteInstallStepParams = {
  itemId: string;
  installerSource: InstallerSource | undefined;
  step: InstallerAction;
  tmpDir: string;
  ctx: InstallerMacroContext;
  stepOperation: StepOperation;
  onOperation?: (operation: Record<string, unknown>) => void;
  reportDownloadProgress: (progress: DownloadProgress) => void;
};

export async function executeInstallStep(params: ExecuteInstallStepParams): Promise<void> {
  const { itemId, installerSource, step, tmpDir, ctx, stepOperation, onOperation, reportDownloadProgress } = params;
  const stepAction = step.action;
  switch (stepAction) {
    case 'download': {
      const src = installerSource;
      if (!src) throw new Error('Download source is not specified');
      let sourceLabel = '';
      if ('GoogleDrive' in src && src.GoogleDrive && typeof src.GoogleDrive.id === 'string' && src.GoogleDrive.id) {
        const fileId = src.GoogleDrive.id;
        sourceLabel = `Google Drive fileId=${fileId}`;
        ctx.downloadPath = await downloadFileFromGoogleDrive(fileId, tmpDir, reportDownloadProgress);
        await logInfo(`[installer ${itemId}] downloading from Google Drive fileId=${fileId} to ${tmpDir}`);
      } else if ('booth' in src && typeof src.booth === 'string' && src.booth) {
        const boothUrl = src.booth;
        sourceLabel = boothUrl;
        await logInfo(`[installer ${itemId}] downloading from BOOTH ${boothUrl} to ${tmpDir}`);
        ctx.downloadPath = await downloadFileFromBoothUrl(boothUrl, tmpDir, {
          onProgress: reportDownloadProgress,
        });
      } else {
        let url = '';
        if ('github' in src && src.github && src.github.owner && src.github.repo) {
          url = await fetchGitHubURL(src.github);
        }
        if ('direct' in src && typeof src.direct === 'string' && src.direct) {
          url = src.direct;
        }
        if (!url) throw new Error('Download source is not specified');
        sourceLabel = url;
        await logInfo(`[installer ${itemId}] downloading from ${url} to ${tmpDir}`);
        ctx.downloadPath = await downloadFileFromUrl(url, tmpDir, {
          onProgress: reportDownloadProgress,
        });
      }
      stepOperation.fromPath = sourceLabel;
      stepOperation.toPath = String(ctx.downloadPath || tmpDir || '');
      emitTestOperation(onOperation, {
        kind: stepOperation.kind,
        status: 'done',
        summary: stepOperation.summary,
        detail: '',
        fromPath: stepOperation.fromPath,
        toPath: stepOperation.toPath,
      });
      break;
    }
    case 'extract': {
      const fromRel = await expandMacros(step.from || ctx.downloadPath, ctx);
      const toRel = await expandMacros(step.to || `{tmp}`, ctx);
      const from = ensureAbsolutePath(fromRel, `install.extract.from`);
      const to = ensureAbsolutePath(toRel, `install.extract.to`);
      stepOperation.fromPath = from;
      stepOperation.toPath = to;
      logInfo(`[installer ${itemId}] extracting from ${from} to ${to}`);
      await extractZip(from, to);
      emitTestOperation(onOperation, {
        kind: stepOperation.kind,
        status: 'done',
        summary: stepOperation.summary,
        detail: '',
        fromPath: stepOperation.fromPath,
        toPath: stepOperation.toPath,
      });
      break;
    }
    case 'extract_sfx': {
      const fromRel = await expandMacros(step.from || ctx.downloadPath, ctx);
      const toRel = await expandMacros(step.to || `{tmp}`, ctx);
      const from = ensureAbsolutePath(fromRel, `install.extract_sfx.from`);
      const to = ensureAbsolutePath(toRel, `install.extract_sfx.to`);
      logInfo(`[installer ${itemId}] extracting SFX from ${from} to ${to}`);
      await extractSevenZipSfx(from, to);
      emitTestOperation(onOperation, {
        kind: 'extract_sfx',
        status: 'done',
        summary: 'extract_sfx を実行しました',
        detail: '',
      });
      break;
    }
    case 'copy': {
      const from = ensureAbsolutePath(await expandMacros(step.from, ctx), `install.copy.from`);
      const to = ensureAbsolutePath(await expandMacros(step.to, ctx), `install.copy.to`);
      stepOperation.fromPath = from;
      stepOperation.toPath = to;
      const count = await copyPattern(from, to);
      logInfo(`[installer ${itemId}] copy matched ${count} files (from=${from} to=${to})`);
      if (count === 0) {
        throw new Error(`copy matched 0 files (from=${from} to=${to})`);
      }
      emitTestOperation(onOperation, {
        kind: stepOperation.kind,
        status: 'done',
        summary: stepOperation.summary,
        detail: `一致件数: ${count}件`,
        fromPath: stepOperation.fromPath,
        toPath: stepOperation.toPath,
      });
      break;
    }
    case 'delete': {
      await executeDeleteAction({
        logPrefix: 'installer',
        itemId: itemId,
        pathValue: step.path,
        ctx,
        pathLabel: 'install.delete.path',
        stepOperation: stepOperation as StepOperationTarget,
        onOperation,
      });
      break;
    }
    case 'run': {
      await executeRunAction({
        step,
        ctx,
        pathLabel: 'install.run.path',
        stepOperation: stepOperation as StepOperationTarget,
        onOperation,
      });
      break;
    }
    case 'run_auo_setup': {
      const pRaw = ensureAbsolutePath(await expandMacros(step.path, ctx), `install.run_auo_setup.path`);
      await runAuoSetup(pRaw);
      emitTestOperation(onOperation, {
        kind: 'run',
        status: 'done',
        summary: 'run_auo_setup を実行しました',
        detail: '',
      });
      break;
    }
    default:
      assertNever(stepAction as never);
  }
}
