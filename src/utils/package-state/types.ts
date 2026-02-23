import * as z from 'zod';

export type PackageStateMeta = {
  uid: string;
  last_snapshot_ts: number;
};

export type PackageStateEvent = Record<string, unknown> & {
  type?: string;
  ts?: number;
  package_id?: string;
  installed?: unknown;
};

export type PackageStateEventPayload = PackageStateEvent & {
  uid: string;
  event_id: string;
  ts: number;
  type: string;
  client_version: string;
};

export const packageStateMetaFileSchema = z.object({
  uid: z.string().optional(),
  last_snapshot_ts: z.number().finite().optional(),
});

export const packageStateQueueFileSchema = z.array(z.record(z.string(), z.unknown()));

export const PACKAGE_STATE_ENDPOINT = (import.meta.env.VITE_PACKAGE_STATE_ENDPOINT || '').trim();
export const PACKAGE_STATE_PENDING_FILE = 'pending_events.json';
export const PACKAGE_STATE_META_FILE = 'package_state.json';
export const PACKAGE_STATE_SNAPSHOT_INTERVAL_SEC = 60 * 60 * 24 * 7;
