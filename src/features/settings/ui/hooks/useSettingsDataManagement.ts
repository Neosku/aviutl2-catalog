import { useCallback, useState } from 'react';
import * as tauriDialog from '@tauri-apps/plugin-dialog';
import * as tauriFs from '@tauri-apps/plugin-fs';
import { useTranslation } from 'react-i18next';
import type { Dispatch, SetStateAction } from 'react';
import type { CatalogAction, CatalogStorePackage } from '@/utils/catalogStore';
import { resolveInstallableCatalogItem } from '@/utils/catalogInstallItem';
import { isInstalledDetectResult } from '@/utils/detectResult';
import { detectInstalledVersionsMap, loadInstalledMap, saveInstalledSnapshot } from '@/utils/installed-map';
import { hasInstaller, runInstallerForItem, runUninstallerForItem } from '@/utils/installer';
import { logError } from '@/utils/logging';
import { normalizeInstalledImport, toErrorMessage } from '../../model/helpers';

interface UseSettingsDataManagementParams {
  catalogItems: CatalogStorePackage[];
  dispatch: Dispatch<CatalogAction>;
  setError: Dispatch<SetStateAction<string>>;
}

async function logSettingsDataError(message: string, error: unknown): Promise<void> {
  try {
    await logError(`[settings] ${message}: ${toErrorMessage(error, 'unknown')}`);
  } catch {}
}

async function showDialogMessage(
  message: string,
  options: { title: string; kind: 'info' | 'warning' | 'error' },
): Promise<void> {
  try {
    await tauriDialog.message(message, options);
  } catch {}
}

function hasUninstaller(item: Awaited<ReturnType<typeof resolveInstallableCatalogItem>> | null | undefined): boolean {
  return Array.isArray(item?.installer?.uninstallSteps) && item.installer.uninstallSteps.length > 0;
}

export default function useSettingsDataManagement({
  catalogItems,
  dispatch,
  setError,
}: UseSettingsDataManagementParams) {
  const { t } = useTranslation(['settings', 'common']);
  const [syncBusy, setSyncBusy] = useState(false);
  const [syncStatus, setSyncStatus] = useState('');

  const onExport = useCallback(async () => {
    if (syncBusy) return;
    setError('');
    setSyncBusy(true);
    setSyncStatus(t('dataManagement.status.pickExport'));
    try {
      const now = new Date();
      const stamp = [
        now.getFullYear(),
        String(now.getMonth() + 1).padStart(2, '0'),
        String(now.getDate()).padStart(2, '0'),
      ].join('');
      const output = await tauriDialog.save({
        title: t('dataManagement.dialogs.exportTitle'),
        defaultPath: `installed-export-${stamp}.json`,
        filters: [{ name: 'JSON', extensions: ['json'] }],
      });
      const savePath = Array.isArray(output) ? output[0] : output;
      if (typeof savePath !== 'string' || !savePath.trim()) return;

      setSyncStatus(t('dataManagement.status.exporting'));
      const installed = await loadInstalledMap();
      await tauriFs.writeTextFile(savePath, JSON.stringify(installed || {}, null, 2));
      await showDialogMessage(t('dataManagement.messages.exportSaved'), {
        title: t('dataManagement.dialogs.exportTitle'),
        kind: 'info',
      });
    } catch (exportError) {
      setError(t('dataManagement.errors.exportFailed'));
      await logSettingsDataError('export failed', exportError);
    } finally {
      setSyncBusy(false);
      setSyncStatus('');
    }
  }, [setError, syncBusy, t]);

  const onImport = useCallback(async () => {
    if (syncBusy) return;
    setError('');
    setSyncBusy(true);
    setSyncStatus(t('dataManagement.status.prepareImport'));
    try {
      const ok = await tauriDialog.confirm(t('dataManagement.messages.importConfirm'), {
        title: t('dataManagement.import'),
        kind: 'warning',
      });
      if (!ok) return;

      setSyncStatus(t('dataManagement.status.pickImport'));
      const selected = await tauriDialog.open({
        title: t('dataManagement.dialogs.importFileTitle'),
        multiple: false,
        directory: false,
        filters: [{ name: 'JSON', extensions: ['json'] }],
      });
      const selectedPath = Array.isArray(selected) ? selected[0] : selected;
      if (typeof selectedPath !== 'string' || !selectedPath.trim()) return;

      setSyncStatus(t('dataManagement.status.readingImport'));
      const raw = await tauriFs.readTextFile(selectedPath);

      let parsed: unknown;
      try {
        parsed = JSON.parse(raw || '{}');
      } catch {
        throw new Error(t('dataManagement.errors.invalidJson'));
      }

      const targetMap = normalizeInstalledImport(parsed);
      const targetIds = Object.keys(targetMap);
      if (!targetIds.length) throw new Error(t('dataManagement.errors.emptyImport'));
      const targetIdSet = new Set(targetIds);

      if (!catalogItems.length) throw new Error(t('dataManagement.errors.catalogMissing'));

      const idToItem = new Map(catalogItems.map((item) => [item.id, item] as const));
      const unknownIds = targetIds.filter((id) => !idToItem.has(id));

      setSyncStatus(t('dataManagement.status.detecting'));
      const detected = await detectInstalledVersionsMap(catalogItems);
      const currentIds = Object.entries(detected || {})
        .filter(([, result]) => isInstalledDetectResult(result))
        .map(([id]) => id);

      const toInstall = targetIds.filter((id) => idToItem.has(id) && !isInstalledDetectResult(detected?.[id]));
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
        if (!item) {
          skippedInstall.push(id);
          continue;
        }
        const resolvedItem = await resolveInstallableCatalogItem(item);
        if (!resolvedItem || !hasInstaller(resolvedItem)) {
          skippedInstall.push(id);
          continue;
        }
        const label = item.name ? `${item.name} (${id})` : id;
        setSyncStatus(t('dataManagement.status.installing', { current: i + 1, total: toInstall.length, label }));
        try {
          await runInstallerForItem(resolvedItem, dispatch);
          installedCount += 1;
        } catch (installError) {
          failedInstall.push(`${id}: ${toErrorMessage(installError, t('common:errors.unknown'))}`);
        }
      }

      for (let i = 0; i < toRemove.length; i += 1) {
        const id = toRemove[i];
        const item = idToItem.get(id);
        if (!item) {
          skippedRemove.push(id);
          continue;
        }
        const resolvedItem = await resolveInstallableCatalogItem(item);
        if (!resolvedItem || !hasUninstaller(resolvedItem)) {
          skippedRemove.push(id);
          continue;
        }
        const label = item.name ? `${item.name} (${id})` : id;
        setSyncStatus(t('dataManagement.status.removing', { current: i + 1, total: toRemove.length, label }));
        try {
          await runUninstallerForItem(resolvedItem, dispatch);
          removedCount += 1;
        } catch (removeError) {
          failedRemove.push(`${id}: ${toErrorMessage(removeError, t('common:errors.unknown'))}`);
        }
      }

      setSyncStatus(t('dataManagement.status.refreshing'));
      const finalDetected = await detectInstalledVersionsMap(catalogItems);
      dispatch({ type: 'SET_DETECTED_MAP', payload: finalDetected });
      const snapshot = normalizeInstalledImport(await saveInstalledSnapshot(finalDetected));
      dispatch({ type: 'SET_INSTALLED_MAP', payload: snapshot });

      const summary = [
        t('dataManagement.summary.installed', { installed: installedCount, total: toInstall.length }),
        t('dataManagement.summary.removed', { removed: removedCount, total: toRemove.length }),
      ];
      if (unknownIds.length) summary.push(t('dataManagement.summary.unknownIds', { ids: unknownIds.join(', ') }));
      if (skippedInstall.length)
        summary.push(t('dataManagement.summary.skippedInstall', { ids: skippedInstall.join(', ') }));
      if (skippedRemove.length)
        summary.push(t('dataManagement.summary.skippedRemove', { ids: skippedRemove.join(', ') }));
      if (failedInstall.length)
        summary.push(t('dataManagement.summary.failedInstall', { ids: failedInstall.join(', ') }));
      if (failedRemove.length) summary.push(t('dataManagement.summary.failedRemove', { ids: failedRemove.join(', ') }));

      const hasIssues =
        unknownIds.length > 0 ||
        skippedInstall.length > 0 ||
        skippedRemove.length > 0 ||
        failedInstall.length > 0 ||
        failedRemove.length > 0;
      await showDialogMessage(summary.join('\n'), {
        title: t('dataManagement.dialogs.importResultTitle'),
        kind: hasIssues ? 'warning' : 'info',
      });
    } catch (importError) {
      setError(toErrorMessage(importError, t('dataManagement.errors.importFailed')));
      await logSettingsDataError('import failed', importError);
    } finally {
      setSyncBusy(false);
      setSyncStatus('');
    }
  }, [catalogItems, dispatch, setError, syncBusy, t]);

  return {
    syncBusy,
    syncStatus,
    onExport,
    onImport,
  };
}
