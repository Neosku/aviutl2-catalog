import { formatUnknownError } from '../errors.js';
import { logError } from '../logging.js';

let packageStateQueueOp: Promise<void> = Promise.resolve();
let packageStateClientVersion: string | null = null;

export function runPackageStateQueueOp<T>(task: () => Promise<T> | T): Promise<T> {
  const next = packageStateQueueOp.then(
    () => task(),
    () => task(),
  );
  packageStateQueueOp = next.then(
    () => undefined,
    () => undefined,
  );
  return next;
}

export function nowUnixSeconds(): number {
  return Math.floor(Date.now() / 1000);
}

export function generateUuidV4(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  if (typeof crypto !== 'undefined' && typeof crypto.getRandomValues === 'function') {
    const buf = new Uint8Array(16);
    crypto.getRandomValues(buf);
    buf[6] = (buf[6] & 0x0f) | 0x40;
    buf[8] = (buf[8] & 0x3f) | 0x80;
    const hex = Array.from(buf, (b: number): string => b.toString(16).padStart(2, '0')).join('');
    return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
  }
  return `uuid-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

export async function getClientVersionCached(): Promise<string> {
  if (typeof packageStateClientVersion === 'string') return packageStateClientVersion;
  try {
    const app = await import('@tauri-apps/api/app');
    const v = app?.getVersion ? await app.getVersion() : '';
    packageStateClientVersion = String(v || '');
  } catch (e: unknown) {
    packageStateClientVersion = '';
    try {
      await logError(`[package-state] getVersion failed: ${formatUnknownError(e)}`);
    } catch {}
  }
  return packageStateClientVersion;
}
