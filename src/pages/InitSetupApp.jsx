import React, { useCallback, useEffect, useLayoutEffect, useMemo, useState } from 'react';
import TitleBar from '../components/TitleBar.jsx';
import Icon from '../components/Icon.jsx';
import ProgressCircle from '../components/ProgressCircle.jsx';
import UpdateDialog from '../components/UpdateDialog.jsx';
import { hasInstaller, logError, runInstallerForItem, loadCatalogData } from '../utils/index.js';
import { useUpdatePrompt } from '../utils/useUpdatePrompt.js';
import { getCurrentWindow } from '@tauri-apps/api/window'
import AppIcon from '../../src-tauri/icons/icon.svg';

async function showMain() {
  const win = getCurrentWindow()
  await win.show()
  await win.setFocus()
}

// DOM 準備済みなら即、まだなら once で
if (document.readyState === 'loading') {
  window.addEventListener('DOMContentLoaded', () => { showMain() }, { once: true })
} else {
  showMain()
}

const CORE_PACKAGE_ID = 'Kenkun.AviUtlExEdit2';
const REQUIRED_PLUGIN_IDS = ['hebiiro.al2_jd', 'rigaya.x264guiEx', 'Mr-Ojii.L-SMASH-Works'];

// 共通の安全ログ関数
async function safeLog(prefix, error) {
  try {
    const detail = error ? (error.message || (error.toString ? error.toString() : '')) : '';
    const message = detail ? `${prefix}: ${detail}` : prefix;
    await logError(message);
  } catch (_) {
    // ignore secondary logging failure
  }
}

// 現在ウィンドウの label を取得
async function fetchWindowLabel() {
  try {
    const mod = await import('@tauri-apps/api/window');
    const getCurrent = typeof mod.getCurrent === 'function'
      ? mod.getCurrent
      : (typeof mod.getCurrentWindow === 'function' ? mod.getCurrentWindow : null);
    const win = getCurrent ? getCurrent() : (mod.appWindow || null);
    if (!win) return '';
    if (typeof win.label === 'string') return win.label;
    if (typeof win.label === 'function') return await win.label();
    return '';
  } catch (e) {
    await safeLog('[init-window] get label failed', e);
    return '';
  }
}

// ステップ表示コンポーネント
function StepIndicator({ step, installed }) {
  const steps = useMemo(() => [
    { id: 'intro', label: '開始' },
    { id: 'question', label: 'インストールの状況' },
    { id: 'details', label: installed ? 'フォルダの指定' : 'インストール' },
    { id: 'packages', label: '推奨パッケージ' },
    { id: 'done', label: '完了' }
  ], [installed]);

  const currentIndex = steps.findIndex(s => s.id === step);

  return (
    <div className="w-full px-10 pt-8 pb-10 shrink-0 z-10 relative">
      <div className="flex items-start justify-between max-w-lg mx-auto relative">
        {/* Line container - Centers of first and last icons (w-7 = 28px) are at 14px from edges */}
        <div className="absolute left-[14px] right-[14px] top-[13px] h-[2px] -z-10">
          <div className="absolute inset-0 bg-slate-200 dark:bg-slate-800 rounded-full" />
          <div 
            className="absolute left-0 top-0 h-full bg-blue-600 transition-all duration-500 ease-out rounded-full"
            style={{ width: `${(currentIndex / (steps.length - 1)) * 100}%` }}
          />
        </div>

        {steps.map((s, index) => {
          const isActive = s.id === step;
          const isCompleted = currentIndex > index;
          
          return (
            <div key={s.id} className="relative flex flex-col items-center group cursor-default">
              <div 
                className={`
                  relative flex items-center justify-center w-7 h-7 rounded-full text-[10px] font-bold transition-colors duration-300 z-10 border-2
                  ${isActive 
                    ? 'bg-blue-600 border-blue-600 text-white shadow-lg shadow-blue-500/25' 
                    : isCompleted 
                      ? 'bg-white dark:bg-slate-900 border-blue-600 text-blue-600' 
                      : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-300 dark:text-slate-600'
                  }
                `}
              >
                {isCompleted ? <Icon name="check" size={14} strokeWidth={4} /> : index + 1}
              </div>
              
              <span 
                className={`
                  absolute top-8 left-1/2 -translate-x-1/2 w-max
                  text-[10.5px] font-bold tracking-wide transition-colors duration-300 whitespace-nowrap
                  ${isActive 
                    ? 'text-blue-600 dark:text-blue-400' 
                    : 'text-slate-400 dark:text-slate-600'
                  }
                `}
              >
                {s.label}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ルートコンポーネント InitSetupApp
export default function InitSetupApp() {
  const [step, setStep] = useState('intro');
  const [installed, setInstalled] = useState(null);
  const [aviutlRoot, setAviutlRoot] = useState('');
  const [portable, setPortable] = useState(false);
  const [installDir, setInstallDir] = useState('');
  const [savingInstallDetails, setSavingInstallDetails] = useState(false);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [label, setLabel] = useState('');
  const [packageItems, setPackageItems] = useState({});
  const [packageStates, setPackageStates] = useState({});
  const [packagesLoading, setPackagesLoading] = useState(false);
  const [packagesError, setPackagesError] = useState('');
  const [bulkDownloading, setBulkDownloading] = useState(false);
  const [packagesDownloadError, setPackagesDownloadError] = useState('');
  const [packageVersions, setPackageVersions] = useState({});
  const [versionsDetected, setVersionsDetected] = useState(false);

  const {
    updateInfo,
    updateBusy,
    updateError,
    confirmUpdate,
    dismissUpdate,
  } = useUpdatePrompt();

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const core = await import('@tauri-apps/api/core');
        const suggested = await core.invoke('default_aviutl2_root');
        if (cancelled) return;
        const suggestedRaw = typeof suggested === 'string' ? suggested : '';
        const value = suggestedRaw ? String(suggestedRaw).trim() : '';
        if (value) {
          setAviutlRoot(prev => prev || value);
          setInstallDir(prev => prev || value);
        }
      } catch (e) {
        await safeLog('[init-window] default aviutl2 root load failed', e);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const fetchCatalogList = useCallback(async () => {
    try {
      const { items } = await loadCatalogData({ timeoutMs: 10000 });
      if (!Array.isArray(items) || !items.length) throw new Error('catalog data unavailable');
      return items;
    } catch (e) {
      await safeLog('[init-window] catalog load failed', e);
      throw e;
    }
  }, []);

  const ensurePackageItem = useCallback(async (id) => {
    if (packageItems[id]) return packageItems[id];
    const list = await fetchCatalogList();
    const found = list.find(it => it && it.id === id) || null;
    if (found) {
      setPackageItems(prev => ({ ...prev, [id]: found }));
      setPackageStates(prev => {
        const next = { ...prev };
        if (!next[id]) next[id] = { downloading: false, installed: false, error: '', progress: null };
        return next;
      });
      return found;
    }
    throw new Error('パッケージ情報が見つかりません: ' + id);
  }, [fetchCatalogList, packageItems, setPackageItems, setPackageStates]);

  const persistAviutlSettings = useCallback(async (rootPath, portableMode) => {
    const normalized = (rootPath || '').trim();
    if (!normalized) throw new Error('AviUtl2 のフォルダを入力してください。');
    const core = await import('@tauri-apps/api/core');
    let resolved = normalized;
    try {
      const candidate = await core.invoke('resolve_aviutl2_root', { raw: normalized });
      if (candidate) resolved = String(candidate);
    } catch (resolveError) {
      await safeLog('[init-window] resolve aviutl2 root failed', resolveError);
    }
    try {
      await core.invoke('update_settings', { aviutl2Root: resolved, isPortableMode: Boolean(portableMode), theme: 'dark', packageStateOptOut: false });
    } catch (invocationError) {
      await safeLog('[init-window] update_settings invoke failed', invocationError);
      throw invocationError;
    }
    setAviutlRoot(resolved);
    return resolved;
  }, [setAviutlRoot]);

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
    fetchWindowLabel().then(value => {
      if (!cancelled) setLabel(String(value || ''));
    });
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!REQUIRED_PLUGIN_IDS.length) return;
      setPackagesLoading(true);
      setPackagesError('');
      try {
        const list = await fetchCatalogList();
        const nextItems = {};
        const missing = [];
        REQUIRED_PLUGIN_IDS.forEach(id => {
          const found = list.find(it => it && it.id === id) || null;
          if (!found) missing.push(id);
          nextItems[id] = found;
        });
        if (!cancelled) {
          setPackageItems(nextItems);
          setPackageStates(prev => {
            const next = { ...prev };
            REQUIRED_PLUGIN_IDS.forEach(id => {
              if (!next[id]) next[id] = { downloading: false, installed: false, error: '', progress: null };
            });
            return next;
          });
          if (missing.length) setPackagesError('一部のパッケージ情報を取得できませんでした: ' + missing.join(', '));
        }
      } catch (e) {
        if (!cancelled) setPackagesError('必須パッケージの情報を読み込めませんでした。');
        await safeLog('[init-window] required packages load failed', e);
      } finally {
        if (!cancelled) setPackagesLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [fetchCatalogList]);

  useEffect(() => {
    if (step === 'packages') setVersionsDetected(false);
  }, [step]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (step !== 'packages') return;
      if (versionsDetected) return;
      try {
        const core = await import('@tauri-apps/api/core');
        const itemsForDetect = REQUIRED_PLUGIN_IDS.map(id => packageItems[id]).filter(Boolean);
        if (itemsForDetect.length === 0) return;
        const result = await core.invoke('detect_versions_map', { items: itemsForDetect });
        if (cancelled) return;
        const versions = (result && typeof result === 'object') ? result : {};
        setPackageVersions(versions);
        const detectedIds = Object.keys(versions || {});
        if (detectedIds.length) {
          setPackageStates(prev => {
            const next = { ...prev };
            detectedIds.forEach(id => {
              const cur = next[id] || { downloading: false, installed: false, error: '', progress: null };
              const ver = String(versions[id] || '').trim();
              next[id] = { ...cur, installed: ver !== '', error: '' };
            });
            return next;
          });
        }
        setVersionsDetected(true);
      } catch (e) {
        await safeLog('[init-window] detect_versions_map failed', e);
      }
    })();
    return () => { cancelled = true; };
  }, [step, packageItems, versionsDetected]);

  function updatePackageState(id, updater) {
    setPackageStates(prev => {
      const current = prev[id] || { downloading: false, installed: false, error: '', progress: null };
      const next = typeof updater === 'function' ? { ...current, ...updater(current) } : { ...current, ...(updater || {}) };
      return { ...prev, [id]: next };
    });
  }

  const requiredPackages = useMemo(() => (
    REQUIRED_PLUGIN_IDS.map(id => ({
      id,
      item: packageItems[id] || null,
      state: packageStates[id] || { downloading: false, installed: false, error: '', progress: null }
    }))
  ), [packageItems, packageStates]);

  const allRequiredInstalled = useMemo(
    () => requiredPackages.every(({ state }) => state.installed),
    [requiredPackages]
  );

  const corePackageState = packageStates[CORE_PACKAGE_ID] || { downloading: false, installed: false, error: '', progress: null };
  const coreProgress = corePackageState?.progress;
  const coreProgressRatio = coreProgress?.ratio ?? 0;
  const coreProgressPercent = Number.isFinite(coreProgress?.percent) ? coreProgress.percent : Math.round(coreProgressRatio * 100);
  const coreProgressLabel = coreProgress?.label ?? '処理中…';

  async function downloadRequiredPackage(id) {
    let pkg = packageItems[id];
    if (!pkg) {
      try { pkg = await ensurePackageItem(id); } 
      catch (e) {
        const detail = e?.message || (e?.toString ? e.toString() : '') || 'パッケージ情報を取得できませんでした。';
        updatePackageState(id, () => ({ downloading: false, error: detail, progress: null }));
        return false;
      }
    }
    if (!pkg || !hasInstaller(pkg)) {
      updatePackageState(id, () => ({ downloading: false, error: 'インストールできないパッケージです。', progress: null }));
      return false;
    }
    const initialProgress = { ratio: 0, percent: 0, label: '準備中…', phase: 'init', step: null, stepIndex: null, totalSteps: null };
    updatePackageState(id, () => ({ downloading: true, installed: false, error: '', progress: initialProgress }));
    const handleProgress = (payload) => {
      if (!payload) return;
      updatePackageState(id, () => ({ progress: payload, downloading: payload.phase !== 'done' && payload.phase !== 'error' }));
    };
    try {
      await runInstallerForItem(pkg, null, handleProgress);
      updatePackageState(id, { downloading: false, installed: true, error: '', progress: null });
      setVersionsDetected(false);
      return true;
    } catch (e) {
      const detail = e?.message || (e?.toString ? e.toString() : '') || 'エラーが発生しました。';
      updatePackageState(id, () => ({ downloading: false, error: detail, progress: null }));
      return false;
    }
  }

  async function downloadAllRequiredPackages() {
    if (bulkDownloading) return;
    setPackagesDownloadError('');
    setBulkDownloading(true);
    try {
      let hasFailure = false;
      for (const { id, state } of requiredPackages) {
        if (state?.installed) continue;
        const success = await downloadRequiredPackage(id);
        if (!success) hasFailure = true;
      }
      if (hasFailure) setPackagesDownloadError('一部のインストールに失敗しました。');
      setVersionsDetected(false);
    } catch (e) {
      setPackagesDownloadError('エラーが発生しました。');
      await safeLog('[init-window] bulk required packages download failed', e);
    } finally {
      setBulkDownloading(false);
    }
  }

  async function handleBulkInstallAndNext() {
    if (allRequiredInstalled) {
       setStep('done');
       return;
    }
    setPackagesDownloadError('');
    setBulkDownloading(true);
    try {
      let hasFailure = false;
      for (const { id, state } of requiredPackages) {
        if (state?.installed) continue;
        const success = await downloadRequiredPackage(id);
        if (!success) hasFailure = true;
      }
      setVersionsDetected(false);
      
      if (hasFailure) {
        setPackagesDownloadError('一部のインストールに失敗しました。');
      } else {
        setStep('done');
      }
    } catch (e) {
      setPackagesDownloadError('エラーが発生しました。');
      await safeLog('[init-window] bulk install and next failed', e);
    } finally {
      setBulkDownloading(false);
    }
  }

  async function handleExistingDetailsNext() {
    if (savingInstallDetails) return;
    if (!canProceedDetails()) return;
    setError('');
    setSavingInstallDetails(true);
    try {
      const normalized = (aviutlRoot || '').trim();
      if (!normalized) { setError('AviUtl2 のフォルダを入力してください。'); return; }
      await persistAviutlSettings(normalized, portable);
      setStep('packages');
    } catch (e) {
      const detail = e?.message || (e?.toString ? e.toString() : '') || '';
      setError(detail ? `設定に失敗しました。
${detail}` : '設定に失敗しました。');
    } finally { setSavingInstallDetails(false); }
  }

  async function handleInstallDetailsNext() {
    if (savingInstallDetails) return;
    if (!canProceedDetails()) return;
    setError('');
    setSavingInstallDetails(true);
    try {
      const normalized = (installDir || '').trim();
      if (!normalized) { setError('インストール先を入力してください。'); return; }
      await persistAviutlSettings(normalized, portable);
      const success = await downloadRequiredPackage(CORE_PACKAGE_ID);
      if (!success) throw new Error('インストールに失敗しました。');
      setStep('packages');
    } catch (e) {
      const detail = e?.message || (e?.toString ? e.toString() : '') || '';
      setError(detail ? `セットアップに失敗しました。
${detail}` : 'セットアップに失敗しました。');
    } finally { setSavingInstallDetails(false); }
  }

  function proceedInstalled(choice) {
    setInstalled(choice);
    setStep('details');
    setError('');
  }

  async function pickDir(kind) {
    try {
      const dialog = await import('@tauri-apps/plugin-dialog');
      const title = kind === 'install' ? 'インストール先を選択' : 'AviUtl2 フォルダを選択';
      const path = await dialog.open({ directory: true, multiple: false, title });
      if (path) {
        const value = String(path);
        if (kind === 'install') setInstallDir(value);
        else setAviutlRoot(value);
        setError('');
      }
    } catch (e) {
      setError('フォルダ選択に失敗しました。');
    }
  }

  async function finalizeSetup() {
    setBusy(true);
    setError('');
    try {
      const core = await import('@tauri-apps/api/core');
      await core.invoke('complete_initial_setup');
    } catch (e) {
      setError(e && e.message ? String(e.message) : '初期設定に失敗しました。');
    } finally { setBusy(false); }
  }

  function canProceedDetails() {
    if (installed === true) return Boolean(aviutlRoot && aviutlRoot.trim());
    if (installed === false) return Boolean(installDir && installDir.trim());
    return false;
  }

  return (
    <>
      <div className="bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-100 h-screen flex flex-col overflow-hidden font-sans select-none relative" data-window-label={label || ''}>
        {/* Subtle Ambient Background */}
        <div className="absolute top-[-20%] left-[-10%] w-[60%] h-[60%] rounded-full bg-blue-400/5 dark:bg-blue-600/5 blur-[120px] pointer-events-none mix-blend-multiply dark:mix-blend-screen animate-pulse-slow" />
        <div className="absolute bottom-[-20%] right-[-10%] w-[60%] h-[60%] rounded-full bg-indigo-400/5 dark:bg-indigo-600/5 blur-[120px] pointer-events-none mix-blend-multiply dark:mix-blend-screen animate-pulse-slow delay-1000" />
        
        {step === 'done' && (
           <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-emerald-500/10 rounded-full blur-[80px] pointer-events-none animate-pulse z-0" />
        )}

        <TitleBar />
        
        <StepIndicator step={step} installed={installed} />

        {/* Main Content Area */}
        <main className="flex-1 overflow-hidden relative flex flex-col z-0">
          <div className="flex-1 w-full max-w-3xl mx-auto px-10 pb-8 flex flex-col h-full overflow-y-auto">

            {error && (
              <div className="mb-4 shrink-0 p-4 rounded-xl border border-red-200/60 bg-red-50/80 backdrop-blur-md text-red-700 dark:border-red-900/40 dark:bg-red-900/20 dark:text-red-300 text-sm flex items-start gap-3 animate-in fade-in slide-in-from-top-2 shadow-sm">
                <Icon name="alert_circle" size={18} className="mt-0.5 shrink-0" />
                <div className="whitespace-pre-wrap flex-1 font-medium leading-relaxed">{error}</div>
              </div>
            )}

            {/* Content: Intro */}
            {step === 'intro' && (
              <div className="flex-1 flex flex-col items-center justify-center text-center animate-in fade-in zoom-in-95 duration-700">
                <div className="relative mb-10 group cursor-default">
                   {/* Icon Container - Matching rounded-2xl style from other pages */}
                   <div className="relative w-32 h-32 p-6 rounded-[28px] bg-white dark:bg-slate-900 shadow-2xl shadow-slate-200/50 dark:shadow-slate-900/50 border border-slate-100 dark:border-slate-800 flex items-center justify-center transform transition-transform duration-500 group-hover:scale-105">
                     <img src={AppIcon} alt="AviUtl2 Catalog" className="w-full h-full object-contain" />
                   </div>
                </div>
                
                <h1 className="text-3xl font-extrabold text-slate-900 dark:text-white mb-4 tracking-tight">
                  AviUtl2 カタログ
                </h1>
                
                <p className="text-slate-500 dark:text-slate-400 text-base leading-7 max-w-md mb-10">
                  AviUtl2 カタログの初期設定を行います
                </p>
                
                <button 
                  className="btn btn--primary h-12 px-10 rounded-xl text-base font-bold shadow-lg shadow-blue-600/20 hover:shadow-blue-600/30 transition-all hover:-translate-y-0.5 bg-blue-600 hover:bg-blue-700 border-transparent text-white cursor-pointer"
                  onClick={() => setStep('question')}
                >
                  セットアップを開始
                </button>
              </div>
            )}

            {/* Content: Question */}
            {step === 'question' && (
              <div className="flex-1 flex flex-col justify-center animate-in fade-in slide-in-from-right-8 duration-500">
                <div className="text-center mb-8">
                  <h2 className="text-2xl font-bold text-slate-900 dark:text-white">インストールの状況</h2>
                  <p className="text-sm text-slate-500 dark:text-slate-400 mt-2">AviUtl2 の導入状況に合わせて選択してください</p>
                </div>

                <div className="grid grid-cols-2 gap-6 mb-8 max-w-2xl mx-auto w-full">
                  <button 
                    onClick={() => proceedInstalled(true)}
                    className="group relative flex flex-col items-start p-6 rounded-2xl border border-slate-200 bg-white hover:border-blue-500 hover:ring-1 hover:ring-blue-500 dark:border-slate-800 dark:bg-slate-900 dark:hover:border-blue-500 transition-all duration-300 shadow-sm hover:shadow-xl text-left h-full cursor-pointer"
                  >
                    <div className="mb-4 p-3 rounded-xl bg-slate-100 text-slate-600 group-hover:bg-blue-50 group-hover:text-blue-600 dark:bg-slate-800 dark:text-slate-400 dark:group-hover:bg-blue-900/30 dark:group-hover:text-blue-400 transition-colors">
                      <Icon name="folder_open" size={28} />
                    </div>
                    <div className="text-lg font-bold text-slate-800 dark:text-slate-100 mb-2 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">インストール済み</div>
                    <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                      すでに AviUtl2 をインストール済みの場合
                    </p>
                  </button>

                  <button 
                    onClick={() => proceedInstalled(false)}
                    className="group relative flex flex-col items-start p-6 rounded-2xl border border-slate-200 bg-white hover:border-blue-500 hover:ring-1 hover:ring-blue-500 dark:border-slate-800 dark:bg-slate-900 dark:hover:border-blue-500 transition-all duration-300 shadow-sm hover:shadow-xl text-left h-full cursor-pointer"
                  >
                    <div className="mb-4 p-3 rounded-xl bg-slate-100 text-slate-600 group-hover:bg-blue-50 group-hover:text-blue-600 dark:bg-slate-800 dark:text-slate-400 dark:group-hover:bg-blue-900/30 dark:group-hover:text-blue-400 transition-colors">
                      <Icon name="download" size={28} />
                    </div>
                    <div className="text-lg font-bold text-slate-800 dark:text-slate-100 mb-2 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">新規インストール</div>
                    <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                      AviUtl2 を導入していない場合<br/>最新版を自動でダウンロードして導入します
                    </p>
                  </button>
                </div>

                <div className="text-center mt-auto">
                   <button 
                     className="h-10 px-8 rounded-xl border border-slate-200 dark:border-slate-800 text-sm font-bold text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-900/50 transition-all cursor-pointer" 
                     onClick={() => setStep('intro')}
                   > 
                     戻る
                   </button>
                </div>
              </div>
            )}

            {/* Content: Details (Existing) */}
            {step === 'details' && installed === true && (
              <div className="flex-1 flex flex-col animate-in fade-in slide-in-from-right-8 duration-500 max-w-2xl mx-auto w-full justify-center">
                <div className="text-center mb-8">
                  <h2 className="text-2xl font-bold text-slate-900 dark:text-white">フォルダの指定</h2>
                  <p className="text-sm text-slate-500 dark:text-slate-400 mt-2">インストール済みの AviUtl2 フォルダを選択してください</p>
                </div>

                <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm space-y-8">
                  <div className="space-y-2">
                    <label className="text-xs font-bold tracking-wider text-slate-500 dark:text-slate-400 ml-1">AviUtl2 フォルダパス</label>
                    <div className="flex rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 overflow-hidden focus-within:border-blue-500 focus-within:ring-1 focus-within:ring-blue-500 transition-all">
                      <input
                        type="text"
                        className="flex-1 h-11 px-4 text-sm font-mono bg-transparent border-none focus:ring-0 placeholder-slate-400 text-slate-800 dark:text-slate-200"
                        value={aviutlRoot}
                        onChange={e => setAviutlRoot(e.target.value)}
                        placeholder="C:\path\to\aviutl"
                      />
                      <button 
                        type="button" 
                        className="px-5 border-l border-slate-200 dark:border-slate-700 text-sm font-bold text-slate-600 dark:text-slate-300 hover:bg-white dark:hover:bg-slate-700 transition-colors cursor-pointer"
                        onClick={() => pickDir('existing')}
                        title="参照"
                      >
                        <Icon name="folder_open" size={18} />
                      </button>
                    </div>
                    <p className="text-[14px] text-slate-400 dark:text-slate-500 ml-1">
                      aviutl2.exe が含まれているフォルダを選択してください
                    </p>
                  </div>

                  <div className="space-y-3">
                    <label className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 ml-1">ポータブルモード設定</label>
                    <div className="grid grid-cols-2 gap-4">
                      <div 
                        onClick={() => setPortable(false)} 
                        className={`cursor-pointer rounded-xl border p-4 transition-all duration-200 ${!portable ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20 ring-1 ring-blue-500' : 'border-slate-200 hover:border-slate-300 bg-white dark:border-slate-700 dark:hover:border-slate-600 dark:bg-slate-800'}`}
                      >
                         <div className="flex items-center gap-2 mb-2">
                            <span className={`font-bold text-sm ${!portable ? 'text-blue-700 dark:text-blue-300' : 'text-slate-700 dark:text-slate-300'}`}>標準（推奨）</span>
                         </div>
                        <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                          プラグインやスクリプトを ProgramData に導入します
                         </p>
                      </div>

                      <div 
                        onClick={() => setPortable(true)} 
                        className={`cursor-pointer rounded-xl border p-4 transition-all duration-200 ${portable ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20 ring-1 ring-blue-500' : 'border-slate-200 hover:border-slate-300 bg-white dark:border-slate-700 dark:hover:border-slate-600 dark:bg-slate-800'}`}
                      >
                         <div className="flex items-center gap-2 mb-2">
                            <span className={`font-bold text-sm ${portable ? 'text-blue-700 dark:text-blue-300' : 'text-slate-700 dark:text-slate-300'}`}>ポータブル</span>
                         </div>
                        <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                          プラグインやスクリプトを aviutl2.exe と同じ階層にある data フォルダに導入します
                         </p>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between mt-8">
                  <button 
                    className="h-11 px-8 rounded-xl border border-slate-200 dark:border-slate-800 text-sm font-bold text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-900/50 transition-all cursor-pointer" 
                    onClick={() => setStep('question')}
                  > 
                    戻る
                  </button>
                  <button 
                    className="btn btn--primary h-11 px-8 rounded-xl shadow-lg shadow-blue-600/20 hover:shadow-blue-600/30 transition-all font-bold bg-blue-600 hover:bg-blue-700 text-white cursor-pointer" 
                    onClick={handleExistingDetailsNext} 
                    disabled={savingInstallDetails || !canProceedDetails()}
                  >
                    {savingInstallDetails ? <span className="flex items-center gap-2"><div className="spinner border-white/30 border-t-white" /> 処理中…</span> : '次へ'}
                  </button>
                </div>
              </div>
            )}

            {/* Content: Details (New Install) */}
            {step === 'details' && installed === false && (
              <div className="flex-1 flex flex-col animate-in fade-in slide-in-from-right-8 duration-500 max-w-2xl mx-auto w-full justify-center">
                 <div className="text-center mb-8">
                  <h2 className="text-2xl font-bold text-slate-900 dark:text-white">インストール先の指定</h2>
                  <p className="text-sm text-slate-500 dark:text-slate-400 mt-2">AviUtl2 をインストールするフォルダを指定してください</p>
                </div>

                <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm space-y-8">
                  <div className="space-y-2">
                    <label className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 ml-1">インストール先フォルダ</label>
                    <div className="flex rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 overflow-hidden focus-within:border-blue-500 focus-within:ring-1 focus-within:ring-blue-500 transition-all">
                      <input
                        type="text"
                        className="flex-1 h-11 px-4 text-sm font-mono bg-transparent border-none focus:ring-0 placeholder-slate-400 text-slate-800 dark:text-slate-200"
                        value={installDir}
                        onChange={e => setInstallDir(e.target.value)}
                        placeholder="C:\path\to\install"
                      />
                      <button 
                        type="button" 
                        className="px-5 border-l border-slate-200 dark:border-slate-700 text-sm font-bold text-slate-600 dark:text-slate-300 hover:bg-white dark:hover:bg-slate-700 transition-colors cursor-pointer"
                        onClick={() => pickDir('install')}
                        title="参照"
                      >
                        <Icon name="folder_open" size={18} />
                      </button>
                    </div>
                  </div>

                  <div className="space-y-3 pt-2">
                    <label className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 ml-1">ポータブルモード設定</label>
                    <div className="grid grid-cols-2 gap-4">
                      <div 
                        onClick={() => setPortable(false)} 
                        className={`cursor-pointer rounded-xl border p-4 transition-all duration-200 ${!portable ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20 ring-1 ring-blue-500' : 'border-slate-200 hover:border-slate-300 bg-white dark:border-slate-700 dark:hover:border-slate-600 dark:bg-slate-800'}`}
                      >
                         <div className="flex items-center gap-2 mb-2">
                            <span className={`font-bold text-sm ${!portable ? 'text-blue-700 dark:text-blue-300' : 'text-slate-700 dark:text-slate-300'}`}>標準 （推奨）</span>
                         </div>
                         <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                           プラグインやスクリプトを ProgramData に導入します
                         </p>
                      </div>

                      <div 
                        onClick={() => setPortable(true)} 
                        className={`cursor-pointer rounded-xl border p-4 transition-all duration-200 ${portable ? 'border-blue-500 bg-blue-50/50 dark:bg-blue-900/10 ring-1 ring-blue-500' : 'border-slate-200 hover:border-slate-300 bg-white dark:border-slate-700 dark:hover:border-slate-600 dark:bg-slate-800'}`}
                      >
                         <div className="flex items-center gap-2 mb-2">
                            <span className={`font-bold text-sm ${portable ? 'text-blue-700 dark:text-blue-300' : 'text-slate-700 dark:text-slate-300'}`}>ポータブル</span>
                         </div>
                         <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                           プラグインやスクリプトを aviutl2.exe と同じ階層にある data フォルダに導入します
                         </p>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between mt-8">
                  <button 
                    className="h-11 px-8 rounded-xl border border-slate-200 dark:border-slate-800 text-sm font-bold text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-900/50 transition-all cursor-pointer" 
                    onClick={() => setStep('question')}
                  > 
                    戻る
                  </button>
                  <button 
                    className="btn btn--primary h-11 px-8 rounded-xl shadow-lg shadow-blue-600/20 hover:shadow-blue-600/30 transition-all font-bold bg-blue-600 hover:bg-blue-700 text-white cursor-pointer" 
                    onClick={handleInstallDetailsNext} 
                    disabled={savingInstallDetails || !canProceedDetails()}
                  >
                     {savingInstallDetails ? (
                       <span className="flex items-center gap-2">
                         <ProgressCircle value={coreProgressRatio} size={16} strokeWidth={4} className="text-white" />
                         インストール中…
                       </span>
                     ) : (
                       <span className="flex items-center gap-2">
                         <Icon name="download" size={18} />
                         インストールして次へ
                       </span>
                     )}
                  </button>
                </div>
              </div>
            )}

            {/* Content: Packages */}
            {step === 'packages' && (
              <div className="flex-1 flex flex-col animate-in fade-in slide-in-from-right-8 duration-500 h-full max-w-2xl mx-auto w-full">
                <div className="text-center mb-6 mt-2 shrink-0">
                  <h2 className="text-2xl font-bold text-slate-900 dark:text-white">推奨パッケージの導入</h2>
                  {allRequiredInstalled ? (
                     <p className="text-sm text-emerald-600 dark:text-emerald-400 font-bold mt-2 flex items-center justify-center gap-2 animate-in fade-in slide-in-from-bottom-1">
                       <Icon name="check_circle" size={16} />
                       すべての推奨パッケージが導入済みです
                     </p>
                  ) : (
                     <p className="text-sm text-slate-500 dark:text-slate-400 mt-2">標準的な利用に必要となる基本プラグインをインストールします</p>
                  )}
                </div>

                {packagesLoading ? (
                   <div className="flex-1 flex flex-col items-center justify-center text-slate-400 gap-3">
                      <div className="spinner w-8 h-8 border-4 border-slate-200 dark:border-slate-800 border-t-blue-500" />
                      <span className="text-sm font-medium">パッケージ情報を取得中…</span>
                   </div>
                ) : (
                  <>
                    <div className="flex-1 overflow-y-auto min-h-0 space-y-3 pr-2 -mr-2 pb-4">
                      {requiredPackages.map(({ id, item, state }) => {
                          const progress = state.progress;
                          const ratio = progress?.ratio ?? 0;
                          const percent = Number.isFinite(progress?.percent) ? progress.percent : Math.round(ratio * 100);

                          return (
                            <div key={id} className="group flex items-center gap-4 p-4 rounded-xl border border-slate-200 bg-white  dark:border-slate-800 dark:bg-slate-900 transition-all shadow-sm">
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 mb-1">
                                  <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 truncate">{item?.name || id}</h3>
                                  {packageVersions[id] && (
                                    <span className="text-[10px] px-1.5 py-0.5 rounded font-mono font-bold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700">
                                      {packageVersions[id]}
                                    </span>
                                  )}
                                </div>
                                <p className="text-xs text-slate-500 dark:text-slate-400 truncate leading-relaxed">{item?.summary || '詳細情報を取得できませんでした'}</p>
                              </div>

                              <div className="shrink-0">
                                {state.downloading ? (
                                  <div className="flex items-center gap-3 bg-slate-50 dark:bg-slate-800 px-3 py-1.5 rounded-full border border-slate-200 dark:border-slate-700">
                                    <div className="text-[10px] font-black text-slate-700 dark:text-slate-300 w-10 text-right tabular-nums">{percent}%</div>
                                    <ProgressCircle value={ratio} size={18} strokeWidth={3} className="text-blue-600 dark:text-blue-400" />
                                  </div>
                                ) : state.installed ? (
                                  <span className="flex items-center gap-1.5 text-[10px] font-bold text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/20 px-3 py-1.5 rounded-full">
                                    <Icon name="check" size={12} strokeWidth={4} /> インストール済
                                  </span>
                                ) : (
                                  <span className="text-[10px] font-bold text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 px-3 py-1.5 rounded-full border border-slate-200 dark:border-slate-700">未インストール</span>
                                )}
                              </div>
                            </div>
                          );
                      })}
                      
                      {packagesError && <div className="text-xs font-medium text-red-600 bg-red-50 dark:bg-red-900/20 p-3 rounded-lg border border-red-100 dark:border-red-900/30">{packagesError}</div>}
                      {packagesDownloadError && <div className="text-xs font-medium text-red-600 bg-red-50 dark:bg-red-900/20 p-3 rounded-lg border border-red-100 dark:border-red-900/30">{packagesDownloadError}</div>}
                    </div>

                    <div className="shrink-0 pt-6 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-4 mt-2">
                      <button 
                        className="h-11 px-8 rounded-xl border border-slate-200 dark:border-slate-800 text-sm font-bold text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-900/50 transition-all cursor-pointer" 
                        onClick={() => setStep('details')}
                      >
                        戻る
                      </button>
                      <div className="flex items-center gap-4">
                        {!allRequiredInstalled && (
                          <button
                            className="h-11 px-8 rounded-xl border border-slate-200 dark:border-slate-800 text-sm font-bold text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-900/50 transition-all cursor-pointer"
                            onClick={() => setStep('done')}
                            disabled={bulkDownloading}
                          >
                            インストールせずに次へ
                          </button>
                        )}
                        <button
                          className="btn btn--primary h-11 px-8 rounded-xl shadow-lg shadow-blue-600/20 hover:shadow-blue-600/30 transition-all font-bold bg-blue-600 hover:bg-blue-700 text-white cursor-pointer"
                          onClick={handleBulkInstallAndNext}
                          disabled={bulkDownloading}
                        >
                           {bulkDownloading ? (
                             <span className="flex items-center gap-2">
                               <div className="spinner border-white/30 border-t-white" />
                               インストール中…
                             </span>
                           ) : allRequiredInstalled ? (
                             '次へ'
                           ) : (
                             <span className="flex items-center gap-2">
                               <Icon name="download" size={18} />
                               まとめてインストールして次へ
                             </span>
                           )}
                        </button>
                      </div>
                    </div>
                  </>
                )}
              </div>
            )}

            {/* Content: Done */}
            {step === 'done' && (
              <div className="w-full flex flex-col items-center my-auto text-center animate-in fade-in zoom-in-95 duration-700">
                <div className="relative mb-10">
                   <div className="absolute inset-0 bg-emerald-500 rounded-full opacity-30 blur-2xl animate-pulse" style={{ animationDuration: '3s' }} />
                   <div className="relative w-24 h-24 rounded-full bg-white dark:bg-slate-900 border-4 border-emerald-500/20 text-emerald-500 dark:text-emerald-400 flex items-center justify-center shadow-2xl backdrop-blur-md">
                     <Icon name="check" size={48} strokeWidth={4} />
                   </div>
                </div>
                
                <h2 className="text-3xl font-extrabold text-slate-900 dark:text-white mb-4 tracking-tight">セットアップ完了</h2>
                <p className="text-slate-500 dark:text-slate-400 mb-12 leading-relaxed max-w-sm text-base">
                  すべての設定が完了しました
                </p>

                <button 
                  className="btn btn--primary h-14 px-12 rounded-xl text-lg font-bold shadow-xl shadow-emerald-600/20 hover:shadow-emerald-600/30 hover:-translate-y-1 active:translate-y-0 transition-all duration-300 bg-emerald-600 hover:bg-emerald-700 text-white border-transparent cursor-pointer" 
                  onClick={finalizeSetup} 
                  disabled={busy}
                >
                  {busy ? <div className="spinner border-white" /> : 'AviUtl2 カタログを開く'}
                </button>
                
                <button 
                  className="mt-8 h-10 px-8 rounded-xl border border-slate-200 dark:border-slate-800 text-xs font-bold text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-900/50 transition-all cursor-pointer" 
                  onClick={() => setStep('packages')}
                > 
                  戻る
                </button>
              </div>
            )}
            
          </div>
        </main>
      </div>
      <UpdateDialog
        open={!!updateInfo}
        version={updateInfo?.version || ''}
        notes={updateInfo?.notes || ''}
        publishedOn={updateInfo?.publishedOn || ''}
        busy={updateBusy}
        error={updateError}
        onConfirm={confirmUpdate}
        onCancel={dismissUpdate}
      />
    </>
  );
}
