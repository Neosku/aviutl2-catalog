import type { InstallerMacroContext } from './types.js';

export async function expandMacros(s: unknown, ctx: InstallerMacroContext): Promise<unknown> {
  const { invoke } = await import('@tauri-apps/api/core');
  const rawDirs = await invoke('get_app_dirs');
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
  const fs = await import('@tauri-apps/plugin-fs');
  const path = await import('@tauri-apps/api/path');
  const base = 'installer-tmp';
  await fs.mkdir(base, { baseDir: fs.BaseDirectory.AppConfig, recursive: true });
  const sub = `${base}/${idVersion}`;
  await fs.mkdir(sub, { baseDir: fs.BaseDirectory.AppConfig, recursive: true });
  const basePath = await path.appConfigDir();
  const absPath = await path.join(basePath, sub);
  return absPath;
}

export async function expandRunArgs(args: string[], ctx: InstallerMacroContext): Promise<string[]> {
  return await Promise.all(args.map(async (arg) => String(await expandMacros(arg, ctx))));
}
