export function logInfo(msg: unknown): Promise<void> {
  return logLine('INFO', msg);
}

export function logError(msg: unknown): Promise<void> {
  return logLine('ERROR', msg);
}

export async function bestEffortLogError(message: string): Promise<void> {
  try {
    await logError(message);
  } catch {
    // logging failures are non-fatal and intentionally ignored
  }
}

async function logLine(level: string, msg: unknown): Promise<void> {
  try {
    const { invoke } = await import('@tauri-apps/api/core');
    await invoke('log_cmd', { level: String(level), msg: String(msg) });
  } catch {}
}
