import { i18n } from '@/i18n';
import { assertNever } from '../errors';
import { logInfo } from '../logging';
import { executeDeleteAction, executeRunAction } from './actions';
import { downloadFileFromBoothUrl, downloadFileFromGoogleDrive, downloadFileFromUrl } from './download';
import {
  copyPattern,
  ensureAbsolutePath,
  expandMacros,
  extractSevenZipSfx,
  extractZip,
  fetchGitHubURL,
  runAuoSetup,
} from './runtime';
import { emitTestOperation } from './shape';
import type {
  DownloadProgress,
  InstallerAction,
  InstallerMacroContext,
  InstallerSource,
  StepOperationTarget,
  TestOperationKind,
} from './types';

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
      if (src.type === 'googleDrive') {
        const fileId = src.id;
        sourceLabel = `Google Drive fileId=${fileId}`;
        ctx.downloadPath = await downloadFileFromGoogleDrive(fileId, tmpDir, reportDownloadProgress);
        await logInfo(`[installer ${itemId}] downloading from Google Drive fileId=${fileId} to ${tmpDir}`);
      } else if (src.type === 'booth') {
        const boothUrl = src.url;
        sourceLabel = boothUrl;
        await logInfo(`[installer ${itemId}] downloading from BOOTH ${boothUrl} to ${tmpDir}`);
        ctx.downloadPath = await downloadFileFromBoothUrl(boothUrl, tmpDir, {
          onProgress: reportDownloadProgress,
        });
      } else {
        let url = '';
        if (src.type === 'githubRelease') {
          url = await fetchGitHubURL(src);
        }
        if (src.type === 'directUrl') {
          url = src.url;
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
    case 'extractSfx': {
      const fromRel = await expandMacros(step.from || ctx.downloadPath, ctx);
      const toRel = await expandMacros(step.to || `{tmp}`, ctx);
      const from = ensureAbsolutePath(fromRel, `install.extractSfx.from`);
      const to = ensureAbsolutePath(toRel, `install.extractSfx.to`);
      logInfo(`[installer ${itemId}] extracting SFX from ${from} to ${to}`);
      await extractSevenZipSfx(from, to);
      emitTestOperation(onOperation, {
        kind: 'extractSfx',
        status: 'done',
        summary: i18n.t('register:tests.extractSfxDone'),
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
        detail: i18n.t('register:tests.matchedCount', { count }),
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
    case 'runAuoSetup': {
      const pRaw = ensureAbsolutePath(await expandMacros(step.path, ctx), `install.runAuoSetup.path`);
      await runAuoSetup(pRaw);
      emitTestOperation(onOperation, {
        kind: 'run',
        status: 'done',
        summary: i18n.t('register:tests.runAuoSetupDone'),
        detail: '',
      });
      break;
    }
    default:
      assertNever(stepAction as never);
  }
}
