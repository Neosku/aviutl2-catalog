import { useCallback, useEffect, useState } from 'react';
import { logError } from './index.js';

function resolvePubDate(update) {
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
  const raw = candidates.find((val) => typeof val === 'string' && val.trim()) || '';
  if (!raw) return { raw: '', label: '' };
  const parsed = new Date(raw);
  if (Number.isNaN(parsed.getTime())) return { raw, label: '' };
  let label = '';
  try {
    label = new Intl.DateTimeFormat('ja-JP', { month: 'numeric', day: 'numeric' }).format(parsed);
  } catch (_) {
    label = `${parsed.getMonth() + 1}月${parsed.getDate()}日`;
  }
  return { raw, label };
}

export function useUpdatePrompt(options = {}) {
  const { autoCheck = true } = options;
  const [updateInfo, setUpdateInfo] = useState(null);
  const [updateBusy, setUpdateBusy] = useState(false);
  const [updateError, setUpdateError] = useState('');

  useEffect(() => {
    if (!autoCheck) return undefined;
    if (import.meta?.env?.DEV) return undefined;
    let cancelled = false;
    (async () => {
      try {
        const { check } = await import('@tauri-apps/plugin-updater');
        const update = await check();
        if (!cancelled && update && (update.available ?? true)) {
          const notes =
            typeof update.body === 'string'
              ? update.body.trim()
              : typeof update.notes === 'string'
                ? update.notes.trim()
                : '';
          const pubDate = resolvePubDate(update);
          setUpdateError('');
          setUpdateInfo({
            update,
            version: update.version || '',
            notes,
            publishedOn: pubDate.label,
            rawPubDate: pubDate.raw,
          });
        }
      } catch (e) {
        try {
          await logError(`[updater] check failed: ${e?.message || e}`);
        } catch (_) {}
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
      } catch (e) {
        try {
          const { message } = await import('@tauri-apps/plugin-dialog');
          await message('アップデートを適用しました。アプリを再起動してください。', {
            title: 'アップデート',
            kind: 'info',
          });
        } catch (_) {}
      }
      setUpdateInfo(null);
    } catch (e) {
      setUpdateError('アップデートに失敗しました。ネットワークや権限をご確認ください。');
      try {
        await logError(`[updater] download/install failed: ${e?.message || e}`);
      } catch (_) {}
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
