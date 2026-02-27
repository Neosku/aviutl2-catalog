import * as tauriShell from '@tauri-apps/plugin-shell';
import { formatUnknownError } from '../errors';
import { ipc } from '../invokeIpc';
import { logError } from '../logging';

declare const Buffer: {
  from(input: string, encoding: string): { toString(encoding: string): string };
};

function psEscape(s: unknown): string {
  return String(s).replace(/'/g, "''");
}

function toPowerShellEncodedCommand(script: unknown): string {
  const s = String(script || '');
  let binary = '';
  for (let i = 0; i < s.length; i++) {
    const codeUnit = s.charCodeAt(i);
    binary += String.fromCharCode(codeUnit & 0xff, codeUnit >> 8);
  }
  if (typeof btoa === 'function') return btoa(binary);
  if (typeof Buffer !== 'undefined') return Buffer.from(binary, 'binary').toString('base64');
  throw new Error('Failed to encode PowerShell command to Base64');
}

export async function runInstallerExecutable(
  exeAbsPath: string,
  args: string[] = [],
  elevate: boolean = false,
): Promise<void> {
  const argList = args.map((a) => `'${psEscape(a)}'`).join(', ');
  const argClause = args.length > 0 ? ` -ArgumentList @(${argList})` : '';
  const body = [
    "$ErrorActionPreference='Stop'",
    '[Console]::OutputEncoding=[System.Text.UTF8Encoding]::new()',
    `$p = Start-Process -FilePath '${psEscape(exeAbsPath)}'${argClause}${elevate ? ' -Verb RunAs' : ''} -WindowStyle Hidden -Wait -PassThru`,
    'exit ($p.ExitCode)',
  ].join('\n');
  const encodedCommand = toPowerShellEncodedCommand(body);
  const argsPs = [
    '-ExecutionPolicy',
    'Bypass',
    '-NoLogo',
    '-NoProfile',
    '-NonInteractive',
    '-EncodedCommand',
    encodedCommand,
  ];
  const cmd = tauriShell.Command.create('powershell', argsPs, { encoding: 'utf-8' });
  const res = await cmd.execute();
  if (res.code !== 0) {
    throw new Error(
      `runExecutableQuietWindows failed (exe=${exeAbsPath}, args=${JSON.stringify(args)}, elevate=${!!elevate}) exit=${res.code}, stderr=${(res.stderr || '').slice(0, 500)}`,
    );
  }
}

export async function runAuoSetup(exeAbsPath: string): Promise<void> {
  try {
    await ipc.runAuoSetup({ exePath: exeAbsPath });
  } catch (e: unknown) {
    await logError(`[runAuoSetup] failed exe=${exeAbsPath}: ${formatUnknownError(e)}`);
    throw e;
  }
}
