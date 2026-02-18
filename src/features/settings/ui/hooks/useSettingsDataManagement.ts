import { useCallback, useState } from 'react';
import type { Dispatch, SetStateAction } from 'react';
import type { CatalogAction, CatalogEntryState } from '../../../../utils/catalogStore.jsx';
import {
  detectInstalledVersionsMap,
  hasInstaller,
  loadInstalledMap,
  logError,
  runInstallerForItem,
  runUninstallerForItem,
  saveInstalledSnapshot,
} from '../../../../utils/index.js';
import { normalizeInstalledImport, toErrorMessage } from '../../model/helpers';

interface UseSettingsDataManagementParams {
  catalogItems: CatalogEntryState[];
  dispatch: Dispatch<CatalogAction>;
  setError: Dispatch<SetStateAction<string>>;
}

function hasUninstaller(item: CatalogEntryState | null | undefined): boolean {
  return Array.isArray(item?.installer?.uninstall) && item.installer.uninstall.length > 0;
}

export default function useSettingsDataManagement({
  catalogItems,
  dispatch,
  setError,
}: UseSettingsDataManagementParams) {
  const [syncBusy, setSyncBusy] = useState(false);
  const [syncStatus, setSyncStatus] = useState('');

  const onExport = useCallback(async () => {
    if (syncBusy) return;
    setError('');
    setSyncBusy(true);
    setSyncStatus('エクスポート先を選択しています…');
    try {
      const dialog = await import('@tauri-apps/plugin-dialog');
      const now = new Date();
      const stamp = [
        now.getFullYear(),
        String(now.getMonth() + 1).padStart(2, '0'),
        String(now.getDate()).padStart(2, '0'),
      ].join('');
      const output = await dialog.save({
        title: 'パッケージ一覧のエクスポート',
        defaultPath: `installed-export-${stamp}.json`,
        filters: [{ name: 'JSON', extensions: ['json'] }],
      });
      const savePath = Array.isArray(output) ? output[0] : output;
      if (typeof savePath !== 'string' || !savePath.trim()) return;

      setSyncStatus('エクスポートを作成中…');
      const installed = await loadInstalledMap();
      const fs = await import('@tauri-apps/plugin-fs');
      await fs.writeTextFile(savePath, JSON.stringify(installed || {}, null, 2));
      try {
        await dialog.message('エクスポートを保存しました。', { title: 'エクスポート', kind: 'info' });
      } catch {}
    } catch (exportError) {
      setError('エクスポートに失敗しました。\n権限や保存先を確認してください。');
      try {
        await logError(`[settings] export failed: ${toErrorMessage(exportError, 'unknown')}`);
      } catch {}
    } finally {
      setSyncBusy(false);
      setSyncStatus('');
    }
  }, [setError, syncBusy]);

  const onImport = useCallback(async () => {
    if (syncBusy) return;
    setError('');
    setSyncBusy(true);
    setSyncStatus('インポート準備中…');
    try {
      const dialog = await import('@tauri-apps/plugin-dialog');
      const ok = await dialog.confirm('インポート内容に合わせてパッケージをインストール/削除します。\n続行しますか？', {
        title: 'インポート',
        kind: 'warning',
      });
      if (!ok) return;

      setSyncStatus('インポートファイルを選択しています…');
      const selected = await dialog.open({
        title: 'インポートファイルを選択',
        multiple: false,
        directory: false,
        filters: [{ name: 'JSON', extensions: ['json'] }],
      });
      const selectedPath = Array.isArray(selected) ? selected[0] : selected;
      if (typeof selectedPath !== 'string' || !selectedPath.trim()) return;

      setSyncStatus('インポートファイルを読み込み中…');
      const fs = await import('@tauri-apps/plugin-fs');
      const raw = await fs.readTextFile(selectedPath);

      let parsed: unknown;
      try {
        parsed = JSON.parse(raw || '{}');
      } catch {
        throw new Error('インポートファイルのJSONを読み込めませんでした。');
      }

      const targetMap = normalizeInstalledImport(parsed);
      const targetIds = Object.keys(targetMap);
      if (!targetIds.length) throw new Error('インポートファイルの内容が空です。');
      const targetIdSet = new Set(targetIds);

      if (!catalogItems.length) throw new Error('カタログ情報が読み込まれていません。');

      const idToItem = new Map(catalogItems.map((item) => [item.id, item] as const));
      const unknownIds = targetIds.filter((id) => !idToItem.has(id));

      setSyncStatus('インストール状態を検出中…');
      const detected = await detectInstalledVersionsMap(catalogItems);
      const currentIds = Object.entries(detected || {})
        .filter(([, version]) => Boolean(version))
        .map(([id]) => id);

      const toInstall = targetIds.filter((id) => idToItem.has(id) && !detected?.[id]);
      const toRemove = currentIds.filter((id) => !targetIdSet.has(id));

      const skippedInstall: string[] = [];
      const skippedRemove: string[] = [];
      const failedInstall: string[] = [];
      const failedRemove: string[] = [];
      let installedCount = 0;
      let removedCount = 0;

      for (let i = 0; i < toInstall.length; i += 1) {
        const id = toInstall[i];
        const item = idToItem.get(id);
        if (!item || !hasInstaller(item)) {
          skippedInstall.push(id);
          continue;
        }
        const label = item.name ? `${item.name} (${id})` : id;
        setSyncStatus(`インストール中… (${i + 1}/${toInstall.length}) ${label}`);
        try {
          await runInstallerForItem(item, dispatch);
          installedCount += 1;
        } catch (installError) {
          failedInstall.push(`${id}: ${toErrorMessage(installError, '不明なエラー')}`);
        }
      }

      for (let i = 0; i < toRemove.length; i += 1) {
        const id = toRemove[i];
        const item = idToItem.get(id);
        if (!item || !hasUninstaller(item)) {
          skippedRemove.push(id);
          continue;
        }
        const label = item.name ? `${item.name} (${id})` : id;
        setSyncStatus(`アンインストール中… (${i + 1}/${toRemove.length}) ${label}`);
        try {
          await runUninstallerForItem(item, dispatch);
          removedCount += 1;
        } catch (removeError) {
          failedRemove.push(`${id}: ${toErrorMessage(removeError, '不明なエラー')}`);
        }
      }

      setSyncStatus('インストール状態を更新中…');
      const finalDetected = await detectInstalledVersionsMap(catalogItems);
      dispatch({ type: 'SET_DETECTED_MAP', payload: finalDetected });
      const snapshot = normalizeInstalledImport(await saveInstalledSnapshot(finalDetected));
      dispatch({ type: 'SET_INSTALLED_MAP', payload: snapshot });

      const summary = [
        `インストール: ${installedCount}/${toInstall.length}件`,
        `削除: ${removedCount}/${toRemove.length}件`,
      ];
      if (unknownIds.length) summary.push(`未登録ID: ${unknownIds.join(', ')}`);
      if (skippedInstall.length) summary.push(`インストール不可: ${skippedInstall.join(', ')}`);
      if (skippedRemove.length) summary.push(`削除不可: ${skippedRemove.join(', ')}`);
      if (failedInstall.length) summary.push(`インストール失敗: ${failedInstall.join(', ')}`);
      if (failedRemove.length) summary.push(`削除失敗: ${failedRemove.join(', ')}`);

      const hasIssues =
        unknownIds.length > 0 ||
        skippedInstall.length > 0 ||
        skippedRemove.length > 0 ||
        failedInstall.length > 0 ||
        failedRemove.length > 0;
      try {
        await dialog.message(summary.join('\n'), {
          title: 'インポート結果',
          kind: hasIssues ? 'warning' : 'info',
        });
      } catch {}
    } catch (importError) {
      setError(toErrorMessage(importError, 'インポートに失敗しました。'));
      try {
        await logError(`[settings] import failed: ${toErrorMessage(importError, 'unknown')}`);
      } catch {}
    } finally {
      setSyncBusy(false);
      setSyncStatus('');
    }
  }, [catalogItems, dispatch, setError, syncBusy]);

  return {
    syncBusy,
    syncStatus,
    onExport,
    onImport,
  };
}
