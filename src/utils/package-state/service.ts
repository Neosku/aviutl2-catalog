import * as tauriWindow from '@tauri-apps/api/window';
import { formatUnknownError } from '../errors';
import { logError, logInfo } from '../logging';
import { getSettings } from '../settings';
import { generateUuidV4, getClientVersionCached, nowUnixSeconds, runPackageStateQueueOp } from './runtime';
import {
  loadPackageStateMeta,
  loadPackageStateQueue,
  removeAppConfigFile,
  savePackageStateMeta,
  savePackageStateQueue,
} from './storage';
import {
  PACKAGE_STATE_ENDPOINT,
  PACKAGE_STATE_PENDING_FILE,
  PACKAGE_STATE_SNAPSHOT_INTERVAL_SEC,
  type PackageStateEvent,
  type PackageStateEventPayload,
} from './types';

async function getCurrentWindowLabel(): Promise<string> {
  try {
    return tauriWindow.getCurrentWindow().label;
  } catch (e: unknown) {
    try {
      await logError(`[package-state] getCurrentWindowLabel failed: ${formatUnknownError(e)}`);
    } catch {}
  }
  return '';
}

async function shouldSkipPackageState(): Promise<boolean> {
  if (!PACKAGE_STATE_ENDPOINT) return true;
  try {
    const settings = await getSettings();
    if (settings.package_state_opt_out === true) return true;
  } catch {}
  const label = await getCurrentWindowLabel();
  return label === 'init-setup';
}

async function getOrCreatePackageStateUid(): Promise<string> {
  const meta = await loadPackageStateMeta();
  if (meta.uid) return meta.uid;
  meta.uid = generateUuidV4();
  await savePackageStateMeta(meta);
  return meta.uid;
}

async function createPackageStateEvent(
  type: string,
  extra: Record<string, unknown>,
): Promise<PackageStateEventPayload> {
  const uid = await getOrCreatePackageStateUid();
  const event_id = generateUuidV4();
  const ts = nowUnixSeconds();
  const client_version = await getClientVersionCached();
  return { uid, event_id, ts, type, client_version, ...extra };
}

async function postPackageStateEvent(event: PackageStateEvent): Promise<void> {
  const res = await fetch(PACKAGE_STATE_ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(event),
  });
  if (!res.ok) {
    throw new Error(`HTTP ${res.status}`);
  }
}

function describePackageStateEvent(event: PackageStateEvent): string {
  const type = event?.type ? String(event.type) : 'unknown';
  if (type === 'snapshot') {
    const count = Array.isArray(event?.installed) ? event.installed.length : 0;
    return `type=snapshot installed=${count}`;
  }
  const pkg = event?.package_id ? String(event.package_id) : '';
  return pkg ? `type=${type} package_id=${pkg}` : `type=${type}`;
}

async function flushPackageStateQueueInternal(preloadedQueue?: PackageStateEvent[]): Promise<void> {
  if (await shouldSkipPackageState()) return;
  const queue = Array.isArray(preloadedQueue) ? preloadedQueue : await loadPackageStateQueue();
  if (!queue.length) return;
  const remaining: PackageStateEvent[] = [];
  for (let i = 0; i < queue.length; i++) {
    const event = queue[i];
    try {
      await postPackageStateEvent(event);
      try {
        await logInfo(`[package-state] sent ${describePackageStateEvent(event)}`);
      } catch {}
      const eventTs = typeof event.ts === 'number' ? event.ts : Number.NaN;
      if (event?.type === 'snapshot' && Number.isFinite(eventTs)) {
        const meta = await loadPackageStateMeta();
        if (eventTs > meta.last_snapshot_ts) {
          meta.last_snapshot_ts = eventTs;
          await savePackageStateMeta(meta);
        }
      }
    } catch (e: unknown) {
      remaining.push(event, ...queue.slice(i + 1));
      try {
        await logError(`[package-state] send failed: ${formatUnknownError(e)}`);
      } catch {}
      break;
    }
  }
  await savePackageStateQueue(remaining);
}

async function enqueuePackageStateEvent(event: PackageStateEvent): Promise<void> {
  const queue = await loadPackageStateQueue();
  queue.push(event);
  await savePackageStateQueue(queue);
  await flushPackageStateQueueInternal(queue);
}

export async function flushPackageStateQueue(): Promise<void> {
  return runPackageStateQueueOp(async () => {
    await flushPackageStateQueueInternal();
  });
}

export async function resetPackageStateLocalState(): Promise<void> {
  return runPackageStateQueueOp(async () => {
    await removeAppConfigFile(PACKAGE_STATE_PENDING_FILE);
    const meta = await loadPackageStateMeta();
    meta.last_snapshot_ts = 0;
    await savePackageStateMeta(meta);
  });
}

export async function recordPackageStateEvent(type: string, packageId: string): Promise<void> {
  return runPackageStateQueueOp(async () => {
    if (await shouldSkipPackageState()) return;
    const id = String(packageId || '').trim();
    if (!id) return;
    const event = await createPackageStateEvent(type, { package_id: id });
    await enqueuePackageStateEvent(event);
  });
}

export async function maybeSendPackageStateSnapshot(detectedMap: Record<string, string>): Promise<void> {
  return runPackageStateQueueOp(async () => {
    if (await shouldSkipPackageState()) return;
    const installed = Object.entries(detectedMap)
      .filter(([, v]) => Boolean(v))
      .map(([id]) => String(id));
    const now = nowUnixSeconds();
    const meta = await loadPackageStateMeta();
    const queue = await loadPackageStateQueue();
    const hasPendingSnapshot = queue.some((evt) => evt && evt.type === 'snapshot');
    const due = !meta.last_snapshot_ts || now - meta.last_snapshot_ts >= PACKAGE_STATE_SNAPSHOT_INTERVAL_SEC;
    if (!hasPendingSnapshot && due) {
      const event = await createPackageStateEvent('snapshot', { installed });
      queue.push(event);
      await savePackageStateQueue(queue);
    }
    await flushPackageStateQueueInternal(queue);
  });
}
