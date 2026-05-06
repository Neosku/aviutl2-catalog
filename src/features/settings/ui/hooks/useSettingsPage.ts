import { type ChangeEvent, useCallback, useEffect, useRef, useState } from 'react';
import * as tauriDialog from '@tauri-apps/plugin-dialog';
import { useTranslation } from 'react-i18next';
import { changeUiLocale, getCurrentUiLocale, normalizeUiLocale } from '@/i18n';
import { DEFAULT_APP_THEME, updateAppSettings } from '@/utils/appSettings';
import { buildCatalogBootstrapPackages, buildCatalogSearchIndexItems } from '@/utils/catalogBootstrapModel';
import { clearCatalogClientSessionCache, loadBootstrapCatalog } from '@/utils/catalogClient';
import { useCatalog, useCatalogDispatch } from '@/utils/catalogStore';
import { ipc } from '@/utils/invokeIpc';
import { detectInstalledVersionsMap } from '@/utils/installed-map';
import { logError } from '@/utils/logging';
import { resetPackageStateLocalState } from '@/utils/package-state';
import { applyTheme, toErrorMessage } from '../../model/helpers';
import type { SettingsFormState } from '../../model/types';
import useSettingsDataManagement from './useSettingsDataManagement';
import useSettingsInitialization from './useSettingsInitialization';

async function logSettingsError(message: string, error: unknown): Promise<void> {
  try {
    await logError(`[settings] ${message}: ${toErrorMessage(error, 'unknown')}`);
  } catch {}
}

function normalizeSettingsFormForSave(form: SettingsFormState, aviutl2Root: string): SettingsFormState {
  return {
    ...form,
    aviutl2Root,
    localManifestPath: form.localManifestPath.trim(),
  };
}

export default function useSettingsPage() {
  const { t, i18n } = useTranslation('settings');
  const { items } = useCatalog();
  const dispatch = useCatalogDispatch();

  const [form, setForm] = useState<SettingsFormState>({
    aviutl2Root: '',
    isPortableMode: false,
    theme: DEFAULT_APP_THEME,
    locale: getCurrentUiLocale(i18n),
    packageStateOptOut: false,
    localModeEnabled: false,
    localManifestPath: '',
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [appVersion, setAppVersion] = useState('');
  const [initialized, setInitialized] = useState(false);
  const [initialPackageStateOptOut, setInitialPackageStateOptOut] = useState(false);
  const savedSnapshotRef = useRef('');
  const previousSavedFormRef = useRef<SettingsFormState | null>(null);

  useSettingsInitialization({
    setForm,
    setInitialPackageStateOptOut,
    setAppVersion,
    setError,
    setInitialized,
  });

  const { syncBusy, syncStatus, onExport, onImport } = useSettingsDataManagement({
    catalogItems: items,
    dispatch,
    setError,
  });

  const onAviutl2RootChange = useCallback((event: ChangeEvent<HTMLInputElement>) => {
    const { value } = event.target;
    setForm((prev) => ({ ...prev, aviutl2Root: value }));
  }, []);

  const onPortableToggle = useCallback((next: boolean) => {
    setForm((prev) => ({ ...prev, isPortableMode: Boolean(next) }));
  }, []);

  const onLocaleChange = useCallback((event: ChangeEvent<HTMLSelectElement>) => {
    const { value } = event.target;
    setForm((prev) => ({ ...prev, locale: normalizeUiLocale(value) }));
  }, []);

  const onPackageStateEnabledToggle = useCallback((nextEnabled: boolean) => {
    setForm((prev) => ({ ...prev, packageStateOptOut: !nextEnabled }));
  }, []);

  const onLocalModeToggle = useCallback((next: boolean) => {
    setForm((prev) => ({ ...prev, localModeEnabled: Boolean(next) }));
  }, []);

  const onLocalManifestPathChange = useCallback((event: ChangeEvent<HTMLInputElement>) => {
    const { value } = event.target;
    setForm((prev) => ({ ...prev, localManifestPath: value }));
  }, []);

  const onToggleTheme = useCallback(() => {
    setForm((prev) => {
      const nextTheme = prev.theme === 'lightmode' ? 'darkmode' : 'lightmode';
      applyTheme(nextTheme);
      return { ...prev, theme: nextTheme };
    });
  }, []);

  const onPickAviutl2Root = useCallback(async () => {
    try {
      const selected = await tauriDialog.open({
        directory: true,
        multiple: false,
        title: t('app.aviutl2Root.dialogTitle'),
      });
      const pathValue = Array.isArray(selected) ? selected[0] : selected;
      if (typeof pathValue !== 'string' || !pathValue.trim()) return;
      setForm((prev) => ({ ...prev, aviutl2Root: pathValue }));
    } catch {
      setError(t('errors.directoryPickFailed'));
    }
  }, [t]);

  const onPickLocalManifest = useCallback(async () => {
    try {
      const selected = await tauriDialog.open({
        directory: false,
        multiple: false,
        title: t('app.developerManifest.dialogTitle'),
        filters: [{ name: 'JSON', extensions: ['json'] }],
      });
      const pathValue = Array.isArray(selected) ? selected[0] : selected;
      if (typeof pathValue !== 'string' || !pathValue.trim()) return;
      setForm((prev) => ({ ...prev, localManifestPath: pathValue }));
    } catch {
      setError(t('errors.filePickFailed'));
    }
  }, [t]);

  const reloadCatalog = useCallback(async () => {
    clearCatalogClientSessionCache();
    dispatch({ type: 'SET_LOADING', payload: true });
    dispatch({ type: 'SET_ERROR', payload: null });

    const catalog = await loadBootstrapCatalog({
      requestedLocale: i18n.resolvedLanguage || i18n.language,
      timeoutMs: 10000,
    });
    const catalogItems = buildCatalogBootstrapPackages(catalog);
    dispatch({ type: 'SET_ITEMS', payload: catalogItems });
    await ipc.setCatalogIndex({ items: buildCatalogSearchIndexItems(catalogItems) });
    const detected = await detectInstalledVersionsMap(catalogItems);
    dispatch({ type: 'SET_DETECTED_MAP', payload: detected });
    dispatch({ type: 'SET_LOADING', payload: false });
  }, [dispatch, i18n.language, i18n.resolvedLanguage]);

  const refreshInstalledVersions = useCallback(
    async (catalogItems = items) => {
      const detected = await detectInstalledVersionsMap(catalogItems);
      dispatch({ type: 'SET_DETECTED_MAP', payload: detected });
    },
    [dispatch, items],
  );

  const persistForm = useCallback(
    async (nextForm: SettingsFormState) => {
      const updated = await updateAppSettings({
        aviutl2Root: nextForm.aviutl2Root,
        isPortableMode: nextForm.isPortableMode,
        theme: nextForm.theme,
        locale: nextForm.locale,
        packageStateOptOut: nextForm.packageStateOptOut,
        localModeEnabled: nextForm.localModeEnabled,
        localManifestPath: nextForm.localManifestPath,
      });
      if (!updated) throw new Error(t('errors.aviutl2Required'));
    },
    [t],
  );

  const saveForm = useCallback(async () => {
    setSaving(true);
    setError('');
    setSuccess('');
    try {
      const resolved = await ipc.resolveAviutl2Root({ raw: String(form.aviutl2Root || '') });
      const aviutl2Root = String(resolved || '').trim();
      if (!aviutl2Root) throw new Error(t('errors.aviutl2Required'));
      const nextForm = normalizeSettingsFormForSave(form, aviutl2Root);
      if (nextForm.localModeEnabled && !nextForm.localManifestPath) {
        throw new Error(t('errors.localManifestRequired'));
      }

      await persistForm(nextForm);

      const previousForm = previousSavedFormRef.current;
      const localeChanged = previousForm !== null && previousForm.locale !== nextForm.locale;
      const catalogSourceChanged =
        previousForm !== null &&
        (previousForm.localModeEnabled !== nextForm.localModeEnabled ||
          previousForm.localManifestPath !== nextForm.localManifestPath);
      const installLocationChanged =
        previousForm !== null &&
        (previousForm.aviutl2Root !== nextForm.aviutl2Root || previousForm.isPortableMode !== nextForm.isPortableMode);

      if (localeChanged) {
        try {
          await changeUiLocale(nextForm.locale);
        } catch (languageError) {
          setError(t('errors.languageApplyFailed'));
          await logSettingsError('changeLanguage failed', languageError);
        }
      }

      applyTheme(nextForm.theme);
      const nextOptOut = Boolean(nextForm.packageStateOptOut);
      if (!initialPackageStateOptOut && nextOptOut) {
        await resetPackageStateLocalState();
      }
      setInitialPackageStateOptOut(nextOptOut);

      if (localeChanged || catalogSourceChanged) {
        try {
          await reloadCatalog();
        } catch (refreshError) {
          if (previousForm) {
            try {
              await persistForm(previousForm);
              clearCatalogClientSessionCache();
            } catch (rollbackError) {
              await logSettingsError('rollback settings failed', rollbackError);
            }
          }
          setError(toErrorMessage(refreshError, t('errors.catalogReloadFailed')));
          dispatch({ type: 'SET_LOADING', payload: false });
          await logSettingsError('reload catalog failed', refreshError);
          throw refreshError;
        }
      } else if (installLocationChanged) {
        try {
          await refreshInstalledVersions();
        } catch (refreshError) {
          await logSettingsError('refresh installed versions failed', refreshError);
        }
      }

      previousSavedFormRef.current = nextForm;
      savedSnapshotRef.current = JSON.stringify(nextForm);
      setForm(nextForm);
      setSuccess(i18n.getFixedT(nextForm.locale, 'settings')('messages.autoSaveSuccess'));
      setTimeout(() => setSuccess(''), 3000);
    } catch (saveError) {
      setError(toErrorMessage(saveError, t('errors.saveFailed')));
      await logSettingsError('save failed', saveError);
    } finally {
      setSaving(false);
    }
  }, [dispatch, form, i18n, initialPackageStateOptOut, persistForm, refreshInstalledVersions, reloadCatalog, t]);

  useEffect(() => {
    if (!initialized) return;

    const snapshot = JSON.stringify(form);
    if (!savedSnapshotRef.current) {
      savedSnapshotRef.current = snapshot;
      previousSavedFormRef.current = form;
      return;
    }
    if (snapshot === savedSnapshotRef.current) return;

    const timer = window.setTimeout(() => {
      void saveForm();
    }, 600);

    return () => window.clearTimeout(timer);
  }, [form, initialized, saveForm]);

  const packageStateEnabled = !form.packageStateOptOut;

  return {
    form,
    saving,
    error,
    success,
    appVersion,
    syncBusy,
    syncStatus,
    packageStateEnabled,
    onAviutl2RootChange,
    onLocaleChange,
    onPortableToggle,
    onPackageStateEnabledToggle,
    onLocalModeToggle,
    onLocalManifestPathChange,
    onToggleTheme,
    onPickAviutl2Root,
    onPickLocalManifest,
    onExport,
    onImport,
  };
}
