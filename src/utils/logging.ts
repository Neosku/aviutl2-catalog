import { ipc } from './invokeIpc';

export type LogLevel = 'trace' | 'debug' | 'info' | 'warn' | 'error';

export function logInfo(msg: unknown): Promise<void> {
  return logLine('info', msg);
}

export function logError(msg: unknown): Promise<void> {
  return logLine('error', msg);
}

export async function bestEffortLogError(message: string): Promise<void> {
  try {
    await logError(message);
  } catch {
    // logging failures are non-fatal and intentionally ignored
  }
}

async function logLine(level: LogLevel, msg: unknown): Promise<void> {
  try {
    await ipc.logCmd({ level: String(level), msg: String(msg) });
  } catch {}
}
