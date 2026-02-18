import { type ChangeEvent, useCallback, useState } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { useCatalog, useCatalogDispatch } from '../../../../utils/catalogStore.jsx';
import { detectInstalledVersionsMap, logError, resetPackageStateLocalState } from '../../../../utils/index.js';
import { applyTheme, toErrorMessage } from '../../model/helpers';
import type { SettingsFormState } from '../../model/types';
import useSettingsDataManagement from './useSettingsDataManagement';
import useSettingsInitialization from './useSettingsInitialization';

export default function useSettingsPage() {
  const { items } = useCatalog();
  const dispatch = useCatalogDispatch();

  const [form, setForm] = useState<SettingsFormState>({
    aviutl2Root: '',
    isPortableMode: false,
    theme: 'darkmode',
    packageStateOptOut: false,
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [appVersion, setAppVersion] = useState('');
  const [initialPackageStateOptOut, setInitialPackageStateOptOut] = useState(false);

  useSettingsInitialization({
    setForm,
    setInitialPackageStateOptOut,
    setAppVersion,
    setError,
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

  const onPackageStateEnabledToggle = useCallback((nextEnabled: boolean) => {
    setForm((prev) => ({ ...prev, packageStateOptOut: !nextEnabled }));
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
      const dialog = await import('@tauri-apps/plugin-dialog');
      const selected = await dialog.open({
        directory: true,
        multiple: false,
        title: 'AviUtl2 のルートフォルダ',
      });
      const pathValue = Array.isArray(selected) ? selected[0] : selected;
      if (typeof pathValue !== 'string' || !pathValue.trim()) return;
      setForm((prev) => ({ ...prev, aviutl2Root: pathValue }));
    } catch {
      setError('ディレクトリ選択に失敗しました');
    }
  }, []);

  const onSave = useCallback(async () => {
    setSaving(true);
    setError('');
    setSuccess('');
    try {
      const resolved = await invoke<string>('resolve_aviutl2_root', { raw: String(form.aviutl2Root || '') });
      const aviutl2Root = String(resolved || '').trim();
      if (!aviutl2Root) throw new Error('AviUtl2 のフォルダを指定してください。');

      await invoke('update_settings', {
        aviutl2Root,
        isPortableMode: Boolean(form.isPortableMode),
        theme: String(form.theme || 'darkmode').trim(),
        packageStateOptOut: Boolean(form.packageStateOptOut),
      });

      applyTheme(form.theme);
      const nextOptOut = Boolean(form.packageStateOptOut);
      if (!initialPackageStateOptOut && nextOptOut) {
        await resetPackageStateLocalState();
      }
      setInitialPackageStateOptOut(nextOptOut);

      try {
        const detected = await detectInstalledVersionsMap(items);
        dispatch({ type: 'SET_DETECTED_MAP', payload: detected });
      } catch {}

      setSuccess('設定を保存しました。');
      setTimeout(() => setSuccess(''), 3000);
    } catch (saveError) {
      setError(toErrorMessage(saveError, '保存に失敗しました。権限やパスをご確認ください。'));
      try {
        await logError(`[settings] save failed: ${toErrorMessage(saveError, 'unknown')}`);
      } catch {}
    } finally {
      setSaving(false);
    }
  }, [dispatch, form, initialPackageStateOptOut, items]);

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
    onPortableToggle,
    onPackageStateEnabledToggle,
    onToggleTheme,
    onPickAviutl2Root,
    onSave,
    onExport,
    onImport,
  };
}
