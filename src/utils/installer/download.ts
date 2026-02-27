import * as tauriEvent from '@tauri-apps/api/event';
import { formatUnknownError } from '../errors';
import { ipc } from '../invokeIpc';
import { bestEffortLogError } from '../logging';
import type { DownloadEventPayload, DownloadOptions } from './types';

const NOOP_RESOLVER = (_value: unknown): void => {};

const DOWNLOAD_PROGRESS_EVENT = 'download:progress';

function createDownloadTaskId(taskId?: string): string {
  if (typeof taskId === 'string' && taskId.trim()) return taskId;
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `dl-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

async function withDownloadProgressListener<T>(
  taskId: string,
  onProgress: DownloadOptions['onProgress'],
  executor: () => Promise<T>,
): Promise<T> {
  if (typeof onProgress !== 'function') {
    return await executor();
  }
  const unlisten = await tauriEvent.listen<DownloadEventPayload>(DOWNLOAD_PROGRESS_EVENT, (evt) => {
    const payload = evt?.payload;
    if (!payload || payload.taskId !== taskId) return;
    const read = typeof payload.read === 'number' ? payload.read : 0;
    const total = typeof payload.total === 'number' ? payload.total : null;
    onProgress({ read, total });
  });
  try {
    return await executor();
  } finally {
    try {
      unlisten();
    } catch (e: unknown) {
      await bestEffortLogError(`[download] unlisten failed: ${formatUnknownError(e)}`);
    }
  }
}

export async function downloadFileFromUrl(
  url: string,
  destPath: string,
  options: DownloadOptions = {},
): Promise<string> {
  if (!/^https:\/\//i.test(url)) throw new Error(`Only https:// is allowed (got: ${url})`);
  if (typeof destPath !== 'string' || !destPath.trim()) throw new Error('destPath must be an existing directory');
  const taskId = createDownloadTaskId(options.taskId);
  return await withDownloadProgressListener(taskId, options.onProgress, async () => {
    try {
      const finalPath = await ipc.downloadFileToPath({ url, destPath, taskId });
      return String(finalPath || '');
    } catch (e: unknown) {
      const detail = formatUnknownError(e) || 'unknown error';
      throw new Error(`downloadFileFromUrl failed (url=${url}): ${detail}`, { cause: e });
    }
  });
}

export async function downloadFileFromGoogleDrive(
  fileId: string,
  destPath: string,
  onProgress?: DownloadOptions['onProgress'],
): Promise<string> {
  const unlisteners: Array<() => void> = [];
  if (typeof onProgress === 'function') {
    const unlisten = await tauriEvent.listen<DownloadEventPayload>('drive:progress', (evt) => {
      const payload = evt?.payload;
      if (!payload || payload.fileId !== fileId) return;
      const read = typeof payload.read === 'number' ? payload.read : 0;
      const total = typeof payload.total === 'number' ? payload.total : null;
      onProgress({ read, total });
    });
    unlisteners.push(unlisten);
  }
  try {
    await ipc.driveDownloadToFile({ fileId, destPath });
    return String(destPath || '');
  } finally {
    for (const unlisten of unlisteners) {
      try {
        unlisten();
      } catch (e: unknown) {
        await bestEffortLogError(`[drive] unlisten failed: ${formatUnknownError(e)}`);
      }
    }
  }
}

const BOOTH_AUTH_WINDOW_LABEL = 'booth-auth';
const BOOTH_LOGIN_COMPLETE_EVENT = 'booth-auth:login-complete';

async function ensureBoothAuthWindow(): Promise<void> {
  await ipc.ensureBoothAuthWindow();
}

async function prepareBoothLoginWait(): Promise<unknown> {
  let resolveFn: (value: unknown) => void = NOOP_RESOLVER;
  const done = new Promise<unknown>((resolve) => {
    resolveFn = resolve;
  });
  const unlisten = await tauriEvent.listen<unknown>(BOOTH_LOGIN_COMPLETE_EVENT, (evt) => {
    try {
      unlisten();
    } catch (e: unknown) {
      void bestEffortLogError(`[booth-auth] unlisten failed: ${formatUnknownError(e)}`);
    }
    resolveFn(evt?.payload);
  });
  return done;
}

export async function closeBoothAuthWindow(): Promise<void> {
  try {
    await ipc.closeBoothAuthWindow();
  } catch (e: unknown) {
    await bestEffortLogError(`[booth-auth] close window failed: ${formatUnknownError(e)}`);
  }
}

export async function downloadFileFromBoothUrl(
  url: string,
  destPath: string,
  options: DownloadOptions = {},
): Promise<string> {
  const taskId = createDownloadTaskId(options.taskId);
  const invokeDownload = (): Promise<string> =>
    ipc.downloadFileToPathBooth({
      url,
      destPath,
      taskId,
      sessionWindowLabel: BOOTH_AUTH_WINDOW_LABEL,
    });
  return await withDownloadProgressListener(taskId, options.onProgress, async () => {
    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        const finalPath = await invokeDownload();
        return String(finalPath || '');
      } catch (e: unknown) {
        const detail = formatUnknownError(e) || 'unknown error';
        const needsAuth = detail.includes('AUTH_REQUIRED') || detail.includes('AUTH_WINDOW_MISSING');
        if (needsAuth && attempt === 0) {
          const waitLogin = prepareBoothLoginWait();
          await ensureBoothAuthWindow();
          await waitLogin;
          continue;
        }
        throw new Error(`downloadFileFromBoothUrl failed (url=${url}): ${detail}`, { cause: e });
      }
    }
    throw new Error(`downloadFileFromBoothUrl failed (url=${url}): AUTH_REQUIRED`);
  });
}
