import { useCallback, useEffect, useLayoutEffect, useState } from 'react';
import { fetchWindowLabel, getErrorMessage, safeLog } from '../../model/helpers';
import type { InitSetupStep, InstalledChoice, PickDirKind } from '../../model/types';

export default function useInitSetupFlow() {
  const [step, setStep] = useState<InitSetupStep>('intro');
  const [installed, setInstalled] = useState<InstalledChoice>(null);
  const [aviutlRoot, setAviutlRoot] = useState('');
  const [portable, setPortable] = useState(false);
  const [installDir, setInstallDir] = useState('');
  const [savingInstallDetails, setSavingInstallDetails] = useState(false);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [label, setLabel] = useState('');

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const { invoke } = await import('@tauri-apps/api/core');
        const suggested = await invoke<string | null>('default_aviutl2_root');
        if (cancelled) return;
        const value = typeof suggested === 'string' ? suggested.trim() : '';
        if (value) {
          setAviutlRoot((prev) => prev || value);
          setInstallDir((prev) => prev || value);
        }
      } catch (fetchError) {
        await safeLog('[init-window] default aviutl2 root load failed', fetchError);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useLayoutEffect(() => {
    const root = document.documentElement;
    const hadDark = root.classList.contains('dark');
    root.classList.add('dark');
    const raf = requestAnimationFrame(() => {
      root.classList.remove('theme-init');
    });
    return () => {
      cancelAnimationFrame(raf);
      if (!hadDark) root.classList.remove('dark');
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    fetchWindowLabel().then((value) => {
      if (!cancelled) setLabel(String(value || ''));
      return value;
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const persistAviutlSettings = useCallback(async (rootPath: string, portableMode: boolean) => {
    const normalized = rootPath.trim();
    if (!normalized) throw new Error('AviUtl2 のフォルダを入力してください。');
    const { invoke } = await import('@tauri-apps/api/core');
    let resolved = normalized;
    try {
      const candidate = await invoke<string | null>('resolve_aviutl2_root', { raw: normalized });
      if (candidate) resolved = String(candidate);
    } catch (resolveError) {
      await safeLog('[init-window] resolve aviutl2 root failed', resolveError);
    }
    try {
      await invoke('update_settings', {
        aviutl2Root: resolved,
        isPortableMode: Boolean(portableMode),
        theme: 'dark',
        packageStateOptOut: false,
      });
    } catch (updateErrorInner) {
      await safeLog('[init-window] update_settings invoke failed', updateErrorInner);
      throw updateErrorInner;
    }
    setAviutlRoot(resolved);
    return resolved;
  }, []);

  const canProceedDetails = useCallback(() => {
    if (installed === true) return Boolean(aviutlRoot.trim());
    if (installed === false) return Boolean(installDir.trim());
    return false;
  }, [aviutlRoot, installDir, installed]);

  const proceedInstalled = useCallback((choice: boolean) => {
    setInstalled(choice);
    setStep('details');
    setError('');
  }, []);

  const pickDir = useCallback(async (kind: PickDirKind) => {
    try {
      const dialog = await import('@tauri-apps/plugin-dialog');
      const title = kind === 'install' ? 'インストール先を選択' : 'AviUtl2 フォルダを選択';
      const path = await dialog.open({ directory: true, multiple: false, title });
      if (!path || Array.isArray(path)) return;
      const value = String(path);
      if (kind === 'install') setInstallDir(value);
      else setAviutlRoot(value);
      setError('');
    } catch {
      setError('フォルダ選択に失敗しました。');
    }
  }, []);

  const finalizeSetup = useCallback(async () => {
    setBusy(true);
    setError('');
    try {
      const { invoke } = await import('@tauri-apps/api/core');
      await invoke('complete_initial_setup');
    } catch (finalizeError) {
      setError(getErrorMessage(finalizeError) || '初期設定に失敗しました。');
    } finally {
      setBusy(false);
    }
  }, []);

  return {
    step,
    setStep,
    installed,
    aviutlRoot,
    setAviutlRoot,
    portable,
    setPortable,
    installDir,
    setInstallDir,
    savingInstallDetails,
    setSavingInstallDetails,
    error,
    setError,
    busy,
    label,
    persistAviutlSettings,
    canProceedDetails,
    proceedInstalled,
    pickDir,
    finalizeSetup,
  };
}
