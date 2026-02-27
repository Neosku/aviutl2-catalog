import * as tauriCore from '@tauri-apps/api/core';
import * as tauriPath from '@tauri-apps/api/path';
import * as tauriFs from '@tauri-apps/plugin-fs';
import type { InstallerMacroContext } from './types';

export async function expandMacros(s: unknown, ctx: InstallerMacroContext): Promise<unknown> {
  const rawDirs = await tauriCore.invoke('get_app_dirs');
  const dirs = rawDirs && typeof rawDirs === 'object' ? (rawDirs as Record<string, unknown>) : {};
  if (typeof s !== 'string') return s;
  return s
    .replaceAll('{tmp}', ctx.tmpDir)
    .replaceAll('{appDir}', typeof dirs.aviutl2_root === 'string' ? dirs.aviutl2_root : '')
    .replaceAll('{pluginsDir}', typeof dirs.plugin_dir === 'string' ? dirs.plugin_dir : '')
    .replaceAll('{scriptsDir}', typeof dirs.script_dir === 'string' ? dirs.script_dir : '')
    .replaceAll('{dataDir}', typeof dirs.aviutl2_data === 'string' ? dirs.aviutl2_data : '')
    .replaceAll('{download}', ctx.downloadPath || '');
}

export async function ensureTmpDir(idVersion: string): Promise<string> {
  const base = 'installer-tmp';
  await tauriFs.mkdir(base, { baseDir: tauriFs.BaseDirectory.AppConfig, recursive: true });
  const sub = `${base}/${idVersion}`;
  await tauriFs.mkdir(sub, { baseDir: tauriFs.BaseDirectory.AppConfig, recursive: true });
  const basePath = await tauriPath.appConfigDir();
  const absPath = await tauriPath.join(basePath, sub);
  return absPath;
}

export async function expandRunArgs(args: string[], ctx: InstallerMacroContext): Promise<string[]> {
  return await Promise.all(args.map(async (arg) => String(await expandMacros(arg, ctx))));
}
