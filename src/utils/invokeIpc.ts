import * as tauriCore from '@tauri-apps/api/core';

type CommandSpec<Args = void, Result = unknown> = {
  args: Args;
  result: Result;
};

type InvokeIpcMap = {
  logCmd: CommandSpec<{ level: string; msg: string }, void>;
  setCatalogIndex: CommandSpec<{ items: unknown[] }, void>;
  getInstalledMapCmd: CommandSpec<void, unknown>;
  addInstalledIdCmd: CommandSpec<{ id: string; version: string }, void>;
  removeInstalledIdCmd: CommandSpec<{ id: string }, void>;
  detectVersionsMap: CommandSpec<{ items: unknown[] }, Record<string, string> | null>;
  downloadFileToPath: CommandSpec<{ url: string; destPath: string; taskId: string }, string>;
  driveDownloadToFile: CommandSpec<{ fileId: string; destPath: string }, void>;
  ensureBoothAuthWindow: CommandSpec<void, void>;
  closeBoothAuthWindow: CommandSpec<void, void>;
  downloadFileToPathBooth: CommandSpec<
    { url: string; destPath: string; taskId: string; sessionWindowLabel: string },
    string
  >;
  runInstallerExecutable: CommandSpec<{ exePath: string; args: string[]; elevate: boolean }, void>;
  runAuoSetup: CommandSpec<{ exePath: string }, void>;
  extractZip: CommandSpec<{ zipPath: string; destPath: string }, void>;
  extract7zSfx: CommandSpec<{ sfxPath: string; destPath: string }, void>;
  copyItemJs: CommandSpec<{ srcStr: string; dstStr: string }, unknown>;
  getAppDirs: CommandSpec<
    void,
    {
      aviutl2_data?: string;
      aviutl2_root?: string;
      plugin_dir?: string;
      script_dir?: string;
    }
  >;
  isAviutlRunning: CommandSpec<void, boolean>;
  launchAviutl2: CommandSpec<void, void>;
  defaultAviutl2Root: CommandSpec<void, string | null>;
  resolveAviutl2Root: CommandSpec<{ raw: string }, string | null>;
  updateSettings: CommandSpec<
    {
      aviutl2Root: string;
      isPortableMode: boolean;
      theme: string;
      packageStateOptOut: boolean;
    },
    void
  >;
  completeInitialSetup: CommandSpec<void, void>;
  calcXxh3Hex: CommandSpec<{ path: string }, string>;
};

type InvokeIpc = {
  [K in keyof InvokeIpcMap]: InvokeIpcMap[K]['args'] extends void
    ? () => Promise<InvokeIpcMap[K]['result']>
    : (args: InvokeIpcMap[K]['args']) => Promise<InvokeIpcMap[K]['result']>;
};

const COMMAND_NAME_OVERRIDES: Partial<Record<keyof InvokeIpcMap, string>> = {
  extract7zSfx: 'extract_7z_sfx',
};

function camelToSnakeCase(str: string): string {
  return str.replace(/[A-Z]/g, (letter) => `_${letter.toLowerCase()}`);
}

export const ipc: InvokeIpc = new Proxy({} as InvokeIpc, {
  get(_target, prop) {
    return async (args?: unknown): Promise<unknown> => {
      try {
        const commandKey = String(prop) as keyof InvokeIpcMap;
        const command = COMMAND_NAME_OVERRIDES[commandKey] ?? camelToSnakeCase(String(prop));
        if (typeof args === 'undefined' || args === null) {
          return await tauriCore.invoke(command);
        }
        return await tauriCore.invoke(command, args as Record<string, unknown>);
      } catch (e: unknown) {
        throw new Error(`invokeIpc.${String(prop)} failed: ${formatUnknownError(e)}`, { cause: e });
      }
    };
  },
});

function formatUnknownError(e: unknown): string {
  if (e instanceof Error) {
    return `${e.name}: ${e.message}`;
  }
  try {
    return JSON.stringify(e);
  } catch {
    return String(e);
  }
}
