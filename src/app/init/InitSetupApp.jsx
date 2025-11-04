import React, { useCallback, useEffect, useMemo, useState } from 'react';
import TitleBar from '../../components/TitleBar.jsx';
import Icon from '../../components/Icon.jsx';
import ProgressCircle from '../../components/ProgressCircle.jsx';
import UpdateDialog from '../../components/UpdateDialog.jsx';
import { hasInstaller, logError, runInstallerForItem, loadCatalogData } from '../utils.js';
import { useUpdatePrompt } from '../hooks/useUpdatePrompt.js';
import { getCurrentWindow } from '@tauri-apps/api/window'

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

// ステップ表示コンポーネント（intro〜done）
function StepIndicator({ step, installed }) {
  const steps = useMemo(() => [
    { id: 'intro', label: '開始' },
    { id: 'question', label: '状況確認' },
    { id: 'details', label: installed ? 'AviUtl2 の場所' : 'インストール先' },
    { id: 'packages', label: '必須パッケージ' },
    { id: 'done', label: '完了' }
  ], [installed]);
  return (
    <ol className="setup-steps" aria-label="初期設定の進行状況">
      {steps.map((s, index) => (
        <React.Fragment key={s.id}>
          <li className={step === s.id ? 'is-active' : ''}>{s.label}</li>
          {index < steps.length - 1 && <span className="setup-steps__arrow">›</span>}
        </React.Fragment>
      ))}
    </ol>
  );
}

// ルートコンポーネント InitSetupApp
export default function InitSetupApp() {
  // 初期ステップは導入ページ
  const [step, setStep] = useState('intro'); // 'intro' | 'question' | 'details' | 'packages' | 'done'
  const [installed, setInstalled] = useState(null); // 既にインストール済みか
  const [aviutlRoot, setAviutlRoot] = useState('');// 既存パス
  const [portable, setPortable] = useState(false);// ポータブルモード
  const [installDir, setInstallDir] = useState('');// 新規インストール先
  const [savingInstallDetails, setSavingInstallDetails] = useState(false);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [label, setLabel] = useState('');// window label

  const [packageItems, setPackageItems] = useState({});// id→メタ情報
  const [packageStates, setPackageStates] = useState({});// id→(downloading/installed/error)
  const [packagesLoading, setPackagesLoading] = useState(false);
  const [packagesError, setPackagesError] = useState('');
  const [bulkDownloading, setBulkDownloading] = useState(false);// bulk download in progress
  const [packagesDownloadError, setPackagesDownloadError] = useState('');// error message for bulk download
  const [packageVersions, setPackageVersions] = useState({}); // id -> detected version string
  const [versionsDetected, setVersionsDetected] = useState(false); // 検出完了フラグ

  const {
    updateInfo,
    updateBusy,
    updateError,
    confirmUpdate,
    dismissUpdate,
  } = useUpdatePrompt();

  // デフォルトのルート候補を事前取得
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
    return () => {
      cancelled = true;
    };
  }, []);

  // カタログ取得（remote → ローカルキャッシュ）
  const fetchCatalogList = useCallback(async () => {
    try {
      const { items } = await loadCatalogData({ timeoutMs: 10000 });
      if (!Array.isArray(items) || !items.length) {
        throw new Error('catalog data unavailable');
      }
      return items;
    } catch (e) {
      await safeLog('[init-window] catalog load failed', e);
      throw e;
    }
  }, []);

  // 単一パッケージ情報を確実に得る
  const ensurePackageItem = useCallback(async (id) => {
    if (packageItems[id]) return packageItems[id];
    const list = await fetchCatalogList();
    const found = list.find(it => it && it.id === id) || null;
    if (found) {
      setPackageItems(prev => ({ ...prev, [id]: found }));
      setPackageStates(prev => {
        const next = { ...prev };
        if (!next[id]) {
          next[id] = { downloading: false, installed: false, error: '', progress: null };
        }
        return next;
      });
      return found;
    }
    throw new Error('パッケージ情報が見つかりません: ' + id);
  }, [fetchCatalogList, packageItems, setPackageItems, setPackageStates]);

  // AviUtl2 設定を反映
  const persistAviutlSettings = useCallback(async (rootPath, portableMode) => {
    const normalized = (rootPath || '').trim();
    if (!normalized) {
      throw new Error('AviUtl2 のフォルダを入力してください。');
    }
    const core = await import('@tauri-apps/api/core');
    let resolved = normalized;
    try {
      const candidate = await core.invoke('resolve_aviutl2_root', { raw: normalized });
      if (candidate) {
        resolved = String(candidate);
      }
    } catch (resolveError) {
      await safeLog('[init-window] resolve aviutl2 root failed', resolveError);
    }
    try {
      await core.invoke('update_settings', { aviutl2Root: resolved, isPortableMode: Boolean(portableMode), theme: 'dark' });
    } catch (invocationError) {
      await safeLog('[init-window] update_settings invoke failed', invocationError);
      throw invocationError;
    }
    setAviutlRoot(resolved);
    return resolved;
  }, [setAviutlRoot]);

  // マウント時の副作用（ラベル取得＆class付与）
  useEffect(() => {
    let cancelled = false;
    fetchWindowLabel().then(value => {
      if (!cancelled) setLabel(String(value || ''));
    });
    try {
      document.documentElement.classList.add('init-setup');
    } catch (_) { }
    return () => {
      cancelled = true;
      try {
        document.documentElement.classList.remove('init-setup');
      } catch (_) { }
    };
  }, []);

  // 必須パッケージの読み込み
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
              if (!next[id]) {
                next[id] = { downloading: false, installed: false, error: '', progress: null };
              }
            });
            return next;
          });
          if (missing.length) {
            setPackagesError('一部のパッケージ情報を取得できませんでした: ' + missing.join(', '));
          }
        }
      } catch (e) {
        if (!cancelled) {
          setPackagesError('必須パッケージの情報を読み込めませんでした。');
        }
        await safeLog('[init-window] required packages load failed', e);
      } finally {
        if (!cancelled) setPackagesLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [fetchCatalogList]);

  // packages に入るたびにバージョン検出をやり直す
  useEffect(() => {
    if (step === 'packages') {
      setVersionsDetected(false);
    }
  }, [step]);

  // 「packages」表示前に detect_versions_map を走らせる
  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (step !== 'packages') return;
      if (versionsDetected) return; // 二重実行防止
      try {
        const core = await import('@tauri-apps/api/core');
        // 検出対象: 取得済みの必須パッケージ item のみ
        const itemsForDetect = REQUIRED_PLUGIN_IDS
          .map(id => packageItems[id])
          .filter(Boolean);
        // if (itemsForDetect.length === 0) return; // 何もなければスキップ
        // 何もなければスキップ（※フラグは立てない：後続で items が入ったら再実行させる）
        if (itemsForDetect.length === 0) return;
        const result = await core.invoke('detect_versions_map', { items: itemsForDetect });
        if (cancelled) return;
        // result は { [id: string]: version: string } の想定
        const versions = (result && typeof result === 'object') ? result : {};
        setPackageVersions(versions);
        // 検出できた id をインストール済みに反映
        const detectedIds = Object.keys(versions || {});
        if (detectedIds.length) {
          setPackageStates(prev => {
            const next = { ...prev };
            detectedIds.forEach(id => {
              const cur = next[id] || { downloading: false, installed: false, error: '', progress: null };
              // next[id] = { ...cur, installed: true, error: '' };
              const ver = String(versions[id] || '').trim();
              // バージョン文字列が空なら「存在しない」とみなす
              next[id] = { ...cur, installed: ver !== '', error: '' };
            });
            return next;
          });
        }
        // 検出を一度完了したので、この入場サイクルでは再実行しない
        setVersionsDetected(true);
      } catch (e) {
        // 検出失敗は致命的ではないのでログのみ
        await safeLog('[init-window] detect_versions_map failed', e);
        // } finally {
        //   if (!cancelled) setVersionsDetected(true);
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
  const coreProgressPercent = Number.isFinite(coreProgress?.percent)
    ? coreProgress.percent
    : Math.round(coreProgressRatio * 100);
  const coreProgressLabel = coreProgress?.label ?? '処理中…';

  const activeRequiredPackage = useMemo(
    () => requiredPackages.find(({ state }) => state.downloading) || null,
    [requiredPackages]
  );
  const activeRequiredProgress = activeRequiredPackage?.state.progress;
  const activeRequiredRatio = activeRequiredProgress?.ratio ?? 0;
  const activeRequiredPercent = Number.isFinite(activeRequiredProgress?.percent)
    ? activeRequiredProgress.percent
    : Math.round(activeRequiredRatio * 100);
  const activeRequiredLabel = activeRequiredProgress?.label ?? '処理中…';
  const activeRequiredName = activeRequiredPackage?.item?.name || activeRequiredPackage?.id || '';
  const bulkProgressLabel = activeRequiredPackage ? activeRequiredLabel : 'インストール中…';
  const bulkProgressPercent = activeRequiredPackage ? activeRequiredPercent : 0;
  const bulkProgressNamePrefix = activeRequiredPackage && activeRequiredName ? `${activeRequiredName}: ` : '';
  const bulkProgressValue = activeRequiredPackage ? activeRequiredRatio : 0;

  async function downloadRequiredPackage(id) {
    let pkg = packageItems[id];
    if (!pkg) {
      try {
        pkg = await ensurePackageItem(id);
      } catch (e) {
        const detail = e?.message || (e?.toString ? e.toString() : '') || 'パッケージ情報を取得できませんでした。';
        updatePackageState(id, () => ({ downloading: false, error: detail, progress: null }));
        await safeLog('[init-window] required package fetch failed (' + id + ')', e);
        return false;
      }
    }
    if (!pkg) {
      updatePackageState(id, () => ({ downloading: false, error: 'パッケージ情報を取得できませんでした。', progress: null }));
      return false;
    }
    if (!hasInstaller(pkg)) {
      updatePackageState(id, () => ({ downloading: false, error: 'このパッケージは現在インストールに対応していません。', progress: null }));
      return false;
    }
    const initialProgress = {
      ratio: 0,
      percent: 0,
      label: '準備中…',
      phase: 'init',
      step: null,
      stepIndex: null,
      totalSteps: null,
    };
    updatePackageState(id, () => ({ downloading: true, installed: false, error: '', progress: initialProgress }));
    const handleProgress = (payload) => {
      if (!payload) return;
      updatePackageState(id, () => ({
        progress: payload,
        downloading: payload.phase !== 'done' && payload.phase !== 'error',
      }));
    };
    try {
      await runInstallerForItem(pkg, null, handleProgress);
      updatePackageState(id, { downloading: false, installed: true, error: '', progress: null });
      // インストールが入ったので検出をリトリガ（同じ packages ステップ内でも再検出）
      setVersionsDetected(false);
      return true;
    } catch (e) {
      const detail = e?.message || (e?.toString ? e.toString() : '') || '処理中にエラーが発生しました。';
      updatePackageState(id, () => ({ downloading: false, error: detail || '処理中にエラーが発生しました。', progress: null }));
      await safeLog('[init-window] required package install failed (' + id + ')', e);
      return false;
    }
  }

  async function downloadAllRequiredPackages() {
    if (bulkDownloading) return;
    setPackagesDownloadError('');
    setBulkDownloading(true);
    try {
      let hasFailure = false;
      // for (const { id } of requiredPackages) {
      for (const { id, state } of requiredPackages) {
        // すでに検出済み or 直前までに入ったものはスキップ
        if (state?.installed) continue;
        const success = await downloadRequiredPackage(id);
        if (!success) {
          hasFailure = true;
        }
      }
      if (hasFailure) {
        setPackagesDownloadError('一部のプラグインのインストールに失敗しました。各プラグインのエラー内容を確認してください。');
      }
      // まとめて入った場合にも念のため再検出
      setVersionsDetected(false);
    } catch (e) {
      setPackagesDownloadError('プラグインのインストール中にエラーが発生しました。');
      await safeLog('[init-window] bulk required packages download failed', e);
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
      if (!normalized) {
        setError('AviUtl2 のフォルダを入力してください。');
        return;
      }
      await persistAviutlSettings(normalized, portable);
      setStep('packages');
    } catch (e) {
      const detail = e?.message || (e?.toString ? e.toString() : '') || '';
      const message = detail ? `AviUtl2 の設定に失敗しました。\n\n${detail}` : 'AviUtl2 の設定に失敗しました。';
      setError(message);
      await safeLog('[init-window] persist existing aviutl root failed', e);
    } finally {
      setSavingInstallDetails(false);
    }
  }

  async function handleInstallDetailsNext() {
    if (savingInstallDetails) return;
    if (!canProceedDetails()) return;
    setError('');
    setSavingInstallDetails(true);
    try {
      const normalized = (installDir || '').trim();
      if (!normalized) {
        setError('AviUtl2 のインストール先を入力してください。');
        return;
      }
      await persistAviutlSettings(normalized, portable);
      // コア本体を取得
      const success = await downloadRequiredPackage(CORE_PACKAGE_ID);
      if (!success) {
        throw new Error('AviUtl2 のインストールに失敗しました。');
      }
      setStep('packages');
    } catch (e) {
      const detail = e?.message || (e?.toString ? e.toString() : '') || '';
      const message = detail ? `AviUtl2 の初期セットアップに失敗しました。\n\n${detail}` : 'AviUtl2 の初期セットアップに失敗しました。';
      setError(message);
      await safeLog('[init-window] core package auto download failed', e);
    } finally {
      setSavingInstallDetails(false);
    }
  }

  function proceedInstalled(choice) {
    setInstalled(choice);
    setStep('details');
    setError('');
  }

  async function pickDir(kind) {
    try {
      const dialog = await import('@tauri-apps/plugin-dialog');
      const title = kind === 'install' ? 'インストール先フォルダを選択' : 'AviUtl2 のフォルダを選択';
      const path = await dialog.open({ directory: true, multiple: false, title });
      if (!path) return;
      const value = String(path);
      if (kind === 'install') setInstallDir(value);
      else setAviutlRoot(value);
      setError('');
    } catch (e) {
      setError('フォルダの選択に失敗しました。');
      await safeLog('[init-window] pickDir failed', e);
    }
  }

  // 完了処理（この関数は done ステップのボタンからのみ呼ぶ）
  async function finalizeSetup() {
    setBusy(true);
    setError('');
    try {
      const core = await import('@tauri-apps/api/core');
      await core.invoke('complete_initial_setup'); // 実装側でウィンドウが閉じる仕様のまま
      // ここでは追加処理なし（complete_initial_setup 側の挙動に任せる）
    } catch (e) {
      const raw = e && (e.message || (e.toString ? e.toString() : ''));
      setError(raw ? String(raw) : '初期設定に失敗しました。');
      await safeLog('[init-window] finalize failed', e);
    } finally {
      setBusy(false);
    }
  }

  function canProceedDetails() {
    if (installed === true) return Boolean(aviutlRoot && aviutlRoot.trim());
    if (installed === false) return Boolean(installDir && installDir.trim());
    return false;
  }

  return (
    <>
      <div className="init-root" data-window-label={label || ''}>
        <TitleBar />
        <div className="setup-body">
          <div className="setup-card">
            <header className="setup-card__header">
              <h1>セットアップ</h1>
              <p>AviUtl2 を使用するための初期設定を行います。</p>
              <StepIndicator step={step} installed={installed} />
            </header>
            <main className="setup-card__content">
              {error && <div className="setup-error" role="alert">{error}</div>}

              {/* 導入ページ */}
              {step === 'intro' && (
                <section className="setup-section">
                  <h2>セットアップの開始</h2>
                  <p>AviUtl2 のインストールや必要なプラグインの準備を行います。</p>
                  <div className="setup-actions">
                    <button className="btn btn--primary" onClick={() => setStep('question')}>
                      セットアップを開始
                    </button>
                  </div>
                </section>
              )}

              {/* インストール有無の質問 */}
              {step === 'question' && (
                <section className="setup-section">
                  <h2>AviUtl2 のインストール状況</h2>
                  <p>AviUtl2 をすでにインストールしていますか？</p>
                  <div className="setup-actions">
                    <button className="btn btn--primary" onClick={() => proceedInstalled(true)}>インストール済み</button>
                    <button className="btn btn--primary" onClick={() => proceedInstalled(false)}>未インストール</button>
                    <button className="btn btn--secondary" onClick={() => setStep('intro')}>戻る</button>
                  </div>
                  {/* <div className="setup-nav"> */}
                  {/* </div> */}
                </section>
              )}

              {/* 既存インストール指定 */}
              {step === 'details' && installed === true && (
                <section className="setup-section">
                  <h2>インストール済みの AviUtl2 を指定</h2>
                  <div className="setup-field">
                    <label>AviUtl2 フォルダのパス</label>
                    <p>aviutl2.exeがあるフォルダを選択してください。</p>
                    <div className="setup-field__input">
                      <input
                        value={aviutlRoot}
                        onChange={e => setAviutlRoot(e.target.value)}
                        placeholder="aviutl2.exe があるフォルダを選択してください"
                      />
                      <button type="button" className="btn" onClick={() => pickDir('existing')}>選択</button>
                    </div>
                  </div>
                  <div className="setup-checkbox">
                    <div className="setup-checkbox__header">ポータブルモード</div>
                    <div className="setup-checkbox__options">
                      <div
                        className={`setup-checkbox__option ${!portable ? 'is-active' : ''}`}
                        onClick={() => setPortable(false)}
                      >
                        <span className="setup-checkbox__option-label">
                          オフ
                          <span className="setup-checkbox__option-badge">推奨</span>
                        </span>
                      </div>
                      <div
                        className={`setup-checkbox__option ${portable ? 'is-active' : ''}`}
                        onClick={() => setPortable(true)}
                      >
                        <span className="setup-checkbox__option-label">オン</span>
                      </div>
                    </div>
                    <p className="setup-checkbox__description">
                      オフ（推奨）: AviUtl2 の設定やプラグインは ProgramData フォルダに保存されます。<br />
                      オン　　　　: aviutl2.exe と同じディレクトリに保存されます。
                    </p>
                  </div>
                  <div className="setup-nav">
                    <button className="btn btn--primary" onClick={handleExistingDetailsNext} disabled={savingInstallDetails || !canProceedDetails()}>
                      {savingInstallDetails ? '処理中…' : '次へ'}
                    </button>
                    <button className="btn btn--secondary" onClick={() => setStep('question')}>戻る</button>
                  </div>
                </section>
              )}

              {/* 新規インストール */}
              {step === 'details' && installed === false && (
                <section className="setup-section">
                  <h2>AviUtl2 をインストール</h2>
                  <p>インストール先のフォルダを指定してください。インストールを実行します。</p>
                  <div className="setup-field">
                    <label>インストール先フォルダ</label>
                    <div className="setup-field__input">
                      <input
                        value={installDir}
                        onChange={e => setInstallDir(e.target.value)}
                        placeholder="インストール先を選択してください"
                      />
                      <button type="button" className="btn" onClick={() => pickDir('install')}>参照</button>
                    </div>
                  </div>
                  <div className="setup-checkbox">
                    <div className="setup-checkbox__header">ポータブルモード</div>
                    <div className="setup-checkbox__options">
                      <div
                        className={`setup-checkbox__option ${!portable ? 'is-active' : ''}`}
                        onClick={() => setPortable(false)}
                      >
                        <span className="setup-checkbox__option-label">
                          オフ
                          <span className="setup-checkbox__option-badge">推奨</span>
                        </span>
                      </div>
                      <div
                        className={`setup-checkbox__option ${portable ? 'is-active' : ''}`}
                        onClick={() => setPortable(true)}
                      >
                        <span className="setup-checkbox__option-label">オン</span>
                      </div>
                    </div>
                    <p className="setup-checkbox__description">
                      オフ（推奨）: AviUtl2 の設定やプラグインは ProgramData フォルダに保存されます。<br />
                      オン　　　　: aviutl2.exe と同じディレクトリに保存されます。
                    </p>
                  </div>
                  {coreProgress && (
                    <div className="setup-note" aria-live="polite">
                      <span className="action-progress">
                        <ProgressCircle
                          value={coreProgressRatio}
                          size={24}
                          strokeWidth={4}
                          ariaLabel={`${coreProgressLabel} ${coreProgressPercent}%`}
                        />
                        <span className="action-progress__label">{coreProgressLabel} {`${coreProgressPercent}%`}</span>
                      </span>
                    </div>
                  )}
                  <div className="setup-nav">
                    <button className="btn btn--primary" onClick={handleInstallDetailsNext} disabled={savingInstallDetails || !canProceedDetails()}>
                      {savingInstallDetails ? 'インストール中…' : 'インストール'}
                    </button>
                    <button className="btn btn--secondary" onClick={() => setStep('question')}>戻る</button>
                  </div>
                </section>
              )}

              {/* 必須パッケージ */}
              {step === 'packages' && (
                <section className="setup-section">
                  <h2>必須パッケージの確認</h2>
                  <p>必要なパッケージをまとめてインストールします。不要であれば、この手順はスキップできます。</p>
                  {packagesLoading && (
                    <div className="setup-note">パッケージ一覧を読み込み中です…</div>
                  )}
                  {packagesError && !packagesLoading && (
                    <div className="setup-note setup-note--error" role="status">{packagesError}</div>
                  )}
                  {packagesDownloadError && (
                    <div className="setup-note setup-note--error" role="status">{packagesDownloadError}</div>
                  )}

                  {!packagesLoading && (
                    <>
                      {allRequiredInstalled && (
                        <div className="setup-actions">
                          <span className="pill pill--ok">
                            <span aria-hidden><Icon name="check_circle" /></span> すべてインストール済み
                          </span>
                        </div>
                      )}

                      <div className="setup-package-list">
                        {requiredPackages.map(({ id, item, state }) => {
                          const progress = state.progress;
                          const ratio = progress?.ratio ?? 0;
                          const percent = Number.isFinite(progress?.percent)
                            ? progress.percent
                            : Math.round(ratio * 100);
                          const label = progress?.label ?? '処理中…';
                          return (
                            <div key={id} className="setup-package-card">
                              <div className="setup-package-card__info">
                                <div className="setup-package-card__title-row">
                                  <h3>{item?.name || id}</h3>
                                  {packageVersions[id] && (
                                    <span className="setup-version-badge" title={`検出バージョン: ${packageVersions[id]}`}>
                                      {packageVersions[id]}
                                    </span>
                                  )}
                                </div>
                                <p>{item?.summary || '詳細情報を取得できませんでした。'}</p>
                              </div>
                              <div className="setup-package-card__status">
                                {state.downloading ? (
                                  <span className="action-progress" aria-live="polite">
                                    <ProgressCircle
                                      value={ratio}
                                      size={20}
                                      strokeWidth={3}
                                      ariaLabel={`${label} ${percent}%`}
                                    />
                                    <span className="action-progress__label">{label} {`${percent}%`}</span>
                                  </span>
                                ) : state.installed ? (
                                  <span className="pill pill--ok">
                                    <span aria-hidden><Icon name="check_circle" /></span> インストール済
                                  </span>
                                ) : (
                                  <span className="setup-status">未インストール</span>
                                )}
                              </div>
                              {state.error && <div className="setup-note setup-note--error" style={{ gridColumn: '1 / -1' }}>{state.error}</div>}
                            </div>
                          );
                        })}
                      </div>

                      <div className="setup-actions">
                        <button
                          className="btn btn--primary"
                          type="button"
                          onClick={downloadAllRequiredPackages}
                          disabled={bulkDownloading || allRequiredInstalled}
                        >
                          <span aria-hidden><Icon name="download" /></span> インストール
                        </button>

                      </div>

                      {/* ここでは finalizeSetup を呼ばず、次のページへ進む */}
                      <div className="setup-nav">
                        <button className="btn btn--primary" onClick={() => setStep('done')}>
                          次へ
                        </button>
                        <button className="btn btn--secondary" type="button" onClick={() => setStep('details')}>戻る</button>
                      </div>
                    </>
                  )}
                </section>
              )}

              {/* 完了ページ（ここで finalizeSetup を実行） */}
              {step === 'done' && (
                <section className="setup-section">
                  <h2>初期設定の完了</h2>
                  <p>セットアップが完了しました。</p>
                  <div className="setup-nav">
                    <button className="btn btn--primary" onClick={finalizeSetup} disabled={busy}>
                      {busy ? '処理中…' : 'セットアップを完了'}
                    </button>
                    <button className="btn btn--secondary" onClick={() => setStep('packages')}>戻る</button>
                  </div>
                </section>
              )}
            </main>
          </div>
        </div>
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
