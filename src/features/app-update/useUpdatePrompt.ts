import { useCallback, useEffect, useState } from 'react';
import { logError } from '../../utils/index.js';

export interface UseUpdatePromptOptions {
  autoCheck?: boolean;
}

export interface UpdatePromptInstallable {
  downloadAndInstall: () => Promise<void>;
}

interface UpdateCheckResult extends UpdatePromptInstallable {
  available?: boolean;
  version?: unknown;
  body?: unknown;
  notes?: unknown;
  pubDate?: unknown;
  pub_date?: unknown;
  publishDate?: unknown;
  publishedAt?: unknown;
  published_at?: unknown;
  releaseDate?: unknown;
  date?: unknown;
}

export interface UpdatePromptInfo {
  update: UpdatePromptInstallable;
  version: string;
  notes: string;
  publishedOn: string;
}

export interface UseUpdatePromptResult {
  updateInfo: UpdatePromptInfo | null;
  updateBusy: boolean;
  updateError: string;
  dismissUpdate: () => void;
  confirmUpdate: () => Promise<void>;
}

function toErrorText(error: unknown): string {
  if (error instanceof Error && error.message) return error.message;
  return String(error ?? 'unknown');
}

function toCleanString(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

function resolvePubDate(update: UpdateCheckResult | null | undefined): { raw: string; label: string } {
  if (!update || typeof update !== 'object') return { raw: '', label: '' };
  const candidates = [
    update.pubDate,
    update.pub_date,
    update.publishDate,
    update.publishedAt,
    update.published_at,
    update.releaseDate,
    update.date,
  ];
  const raw = candidates.map(toCleanString).find(Boolean) || '';
  if (!raw) return { raw: '', label: '' };

  const parsed = new Date(raw);
  if (Number.isNaN(parsed.getTime())) return { raw, label: '' };

  let label = '';
  try {
    label = new Intl.DateTimeFormat('ja-JP', { month: 'numeric', day: 'numeric' }).format(parsed);
  } catch {
    label = `${parsed.getMonth() + 1}月${parsed.getDate()}日`;
  }

  return { raw, label };
}

export function useUpdatePrompt(options: UseUpdatePromptOptions = {}): UseUpdatePromptResult {
  const { autoCheck = true } = options;
  const [updateInfo, setUpdateInfo] = useState<UpdatePromptInfo | null>(null);
  const [updateBusy, setUpdateBusy] = useState(false);
  const [updateError, setUpdateError] = useState('');

  useEffect(() => {
    if (!autoCheck) return undefined;
    if (import.meta.env.DEV) return undefined;

    let cancelled = false;

    (async () => {
      try {
        const mod = (await import('@tauri-apps/plugin-updater')) as {
          check?: () => Promise<UpdateCheckResult | null>;
        };
        if (typeof mod.check !== 'function') return;

        const update = await mod.check();
        if (!cancelled && update && (update.available ?? true) && typeof update.downloadAndInstall === 'function') {
          const notes = toCleanString(update.body) || toCleanString(update.notes);
          const pubDate = resolvePubDate(update);

          setUpdateError('');
          setUpdateInfo({
            update,
            version: toCleanString(update.version),
            notes,
            publishedOn: pubDate.label,
          });
        }
      } catch (error) {
        await logError(`[updater] check failed: ${toErrorText(error)}`);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [autoCheck]);

  const dismissUpdate = useCallback(() => {
    if (updateBusy) return;
    setUpdateInfo(null);
    setUpdateError('');
  }, [updateBusy]);

  const confirmUpdate = useCallback(async () => {
    if (!updateInfo?.update) return;
    setUpdateBusy(true);
    setUpdateError('');
    try {
      await updateInfo.update.downloadAndInstall();
      try {
        const { relaunch } = await import('@tauri-apps/plugin-process');
        await relaunch();
      } catch {
        try {
          const { message } = await import('@tauri-apps/plugin-dialog');
          await message('アップデートを適用しました。アプリを再起動してください。', {
            title: 'アップデート',
            kind: 'info',
          });
        } catch {}
      }
      setUpdateInfo(null);
    } catch (error) {
      setUpdateError('アップデートに失敗しました。ネットワークや権限をご確認ください。');
      await logError(`[updater] download/install failed: ${toErrorText(error)}`);
    } finally {
      setUpdateBusy(false);
    }
  }, [updateInfo]);

  return {
    updateInfo,
    updateBusy,
    updateError,
    dismissUpdate,
    confirmUpdate,
  };
}
