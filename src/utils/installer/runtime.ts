import { formatUnknownError } from '../errors';
import { ipc } from '../invokeIpc';
import { logError } from '../logging';

export async function runInstallerExecutable(
  exeAbsPath: string,
  args: string[] = [],
  elevate: boolean = false,
): Promise<void> {
  await ipc.runInstallerExecutable({ exePath: exeAbsPath, args, elevate });
}

export async function runAuoSetup(exeAbsPath: string): Promise<void> {
  try {
    await ipc.runAuoSetup({ exePath: exeAbsPath });
  } catch (e: unknown) {
    await logError(`[runAuoSetup] failed exe=${exeAbsPath}: ${formatUnknownError(e)}`);
    throw e;
  }
}

export { ensureAbsolutePath, deletePath, extractZip, extractSevenZipSfx, copyPattern } from './fs-ops';
export { fetchGitHubURL } from './github';
export { expandMacros, ensureTmpDir, expandRunArgs } from './macros';
export { ensureAviutlClosed } from './process';
