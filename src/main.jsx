import React, { useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import AppRouter from './Router.jsx';
import TitleBar from './components/TitleBar.jsx';
import UpdateDialog from './components/UpdateDialog.jsx';
import { CatalogProvider, useCatalogDispatch, initCatalog } from './utils/catalogStore.jsx';
import {
  loadInstalledMap,
  detectInstalledVersionsMap,
  saveInstalledSnapshot,
  getSettings,
  logError,
  loadCatalogData,
  flushPackageStateQueue,
  maybeSendPackageStateSnapshot,
} from './utils/index.js';
import { useUpdatePrompt } from './utils/useUpdatePrompt.js';
import InitSetupApp from './pages/InitSetupApp.jsx';
// eslint-disable-next-line import/no-unassigned-import
import './styles/index.css';
import { getCurrentWindow } from '@tauri-apps/api/window';

const bootRoot = document?.documentElement;
if (bootRoot) {
  bootRoot.classList.add('dark');
  bootRoot.classList.add('theme-init');
}

async function showMain() {
  const win = getCurrentWindow();
  await win.show();
  await win.setFocus();
}

// DOM 準備済みなら即、まだなら once で
if (document.readyState === 'loading') {
  window.addEventListener(
    'DOMContentLoaded',
    () => {
      showMain();
    },
    { once: true },
  );
} else {
  showMain();
}

async function detectWindowLabel() {
  try {
    const mod = await import('@tauri-apps/api/window');
    const getCurrent =
      typeof mod.getCurrent === 'function'
        ? mod.getCurrent
        : typeof mod.getCurrentWindow === 'function'
          ? mod.getCurrentWindow
          : null;
    const win = getCurrent ? getCurrent() : mod.appWindow || null;
    if (!win) return 'main';
    if (typeof win.label === 'string') return win.label;
    if (typeof win.label === 'function') {
      try {
        return await win.label();
      } catch {
        return 'main';
      }
    }
  } catch (e) {
    try {
      await logError(`[bootstrap] detectWindowLabel failed: ${e?.message || e}`);
    } catch {}
  }
  return 'main';
}

// アプリケーション初期化コンポーネント
// カタログの読み込み・検出・状態反映を行う起動用コンポーネント
function Bootstrapper() {
  const dispatch = useCatalogDispatch();
  const { updateInfo, updateBusy, updateError, confirmUpdate, dismissUpdate } = useUpdatePrompt();

  // Webアプリの右クリックコンテキストメニューを無効化
  useEffect(() => {
    const onCtx = (e) => {
      // 必要に応じて .allow-contextmenu クラスを持つ要素のみ許可
      if (e.target && typeof e.target.closest === 'function' && e.target.closest('.allow-contextmenu')) return;
      e.preventDefault();
    };
    window.addEventListener('contextmenu', onCtx);
    return () => window.removeEventListener('contextmenu', onCtx);
  }, []);

  // グローバルエラーがをapp.logに記録
  useEffect(() => {
    const onError = async (e) => {
      try {
        await logError(`[window.error] ${e?.message || e}`);
      } catch {}
    };
    const onRejection = async (e) => {
      const reason = e?.reason;
      const msg =
        (reason && (reason.message || (reason.toString && reason.toString()))) ||
        String(reason || 'unhandled rejection');
      try {
        await logError(`[window.unhandledrejection] ${msg}`);
      } catch {}
    };
    const origError = console.error;
    console.error = (...args) => {
      try {
        origError?.(...args);
      } catch {}
      try {
        logError(
          `[console.error] ${args.map((a) => (a && a.stack ? a.stack : a && a.message ? a.message : String(a))).join(' ')}`,
        );
      } catch {}
    };
    window.addEventListener('error', onError);
    window.addEventListener('unhandledrejection', onRejection);
    return () => {
      try {
        console.error = origError;
      } catch {}
      window.removeEventListener('error', onError);
      window.removeEventListener('unhandledrejection', onRejection);
    };
  }, []);

  // Markdown内のリンクは既定ブラウザで開く
  useEffect(() => {
    const handler = (event) => {
      const target = event?.target;
      if (!target || typeof target.closest !== 'function') return;
      const anchor = target.closest('.md a[href]');
      if (!anchor || event.defaultPrevented) return;
      const rawHref = anchor.getAttribute('href') || '';
      if (!rawHref || rawHref.trim().startsWith('#') || /^javascript:/i.test(rawHref)) return;
      event.preventDefault();
      openMarkdownLinkExternally(rawHref);
    };
    document.addEventListener('click', handler);
    return () => document.removeEventListener('click', handler);
  }, []);

  // アプリケーション初期化処理（カタログ読み込み・テーマ適用・インストール状態検出）
  useEffect(() => {
    let cancelled = false;
    (async () => {
      // 設定からテーマを早期に適用
      const root = document?.documentElement;
      try {
        const s = await getSettings();
        let theme = s && s.theme ? String(s.theme) : '';
        if (theme === 'noir') theme = 'darkmode';
        const isDark = theme !== 'lightmode';
        root?.classList.toggle('dark', isDark);
      } catch (e) {
        try {
          await logError(`[bootstrap] theme apply failed: ${e?.message || e}`);
        } catch {}
      }
      root?.classList.remove('theme-init');
      // パッケージ状態キューをフラッシュ
      try {
        await flushPackageStateQueue();
      } catch (e) {
        try {
          await logError(`[package-state] flush failed: ${e?.message || e}`);
        } catch {}
      }

      try {
        // インストール情報を先に読み込んでアイテムを装飾
        const installedMap = await loadInstalledMap();
        if (!cancelled) dispatch({ type: 'SET_INSTALLED_MAP', payload: installedMap });

        let catalogItems;
        try {
          const { items } = await loadCatalogData({ timeoutMs: 10000 });
          catalogItems = items;
        } catch (e) {
          console.warn('Catalog load failed:', e);
          try {
            await logError(`[bootstrap] loadCatalogData failed: ${e?.message || e}`);
          } catch {}
        }

        if (Array.isArray(catalogItems) && catalogItems.length > 0) {
          const items = catalogItems;
          if (!cancelled) dispatch({ type: 'SET_ITEMS', payload: items });
          // 高速検索のためにRust側のカタログインデックスを構築
          try {
            const { invoke } = await import('@tauri-apps/api/core');
            await invoke('set_catalog_index', { items });
          } catch (e) {
            try {
              await logError(`[bootstrap] set_catalog_index failed: ${e?.message || e}`);
            } catch {}
          }
          // ファイルのハッシュでインストール済みバージョンを検出
          try {
            const detected = await detectInstalledVersionsMap(items);
            if (!cancelled) {
              dispatch({ type: 'SET_DETECTED_MAP', payload: detected });
              // 検出結果をinstalled.jsonにスナップショット保存
              try {
                const snap = await saveInstalledSnapshot(detected);
                dispatch({ type: 'SET_INSTALLED_MAP', payload: snap });
              } catch (e) {
                try {
                  await logError(`[bootstrap] saveInstalledSnapshot failed: ${e?.message || e}`);
                } catch {}
              }
              // パッケージ状態スナップショットを送信
              try {
                await maybeSendPackageStateSnapshot(detected);
              } catch (e) {
                try {
                  await logError(`[package-state] snapshot failed: ${e?.message || e}`);
                } catch {}
              }
            }
          } catch (e) {
            try {
              await logError(`[bootstrap] detectInstalledVersionsMap failed: ${e?.message || e}`);
            } catch {}
          }
        } else {
          if (!cancelled)
            dispatch({
              type: 'SET_ERROR',
              payload: 'カタログの読み込みに失敗しました（ネットワーク/キャッシュなし）。',
            });
        }
      } catch (e) {
        console.error('Failed to load catalog:', e);
        if (!cancelled) dispatch({ type: 'SET_ERROR', payload: 'カタログの読み込みに失敗しました。' });
      } finally {
        if (!cancelled) dispatch({ type: 'SET_LOADING', payload: false });
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [dispatch]);

  // アップデート確認（起動時1回）
  return (
    <>
      <AppRouter />
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

// メインアプリケーションコンポーネント
// 状態プロバイダでラップし、アプリ全体を描画
function App() {
  return (
    <>
      <TitleBar />
      <div className="app-scroll">
        <CatalogProvider init={initCatalog()}>
          <Bootstrapper />
        </CatalogProvider>
      </div>
    </>
  );
}

function RootApp() {
  const [mode, setMode] = useState('loading');

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const label = await detectWindowLabel();
      if (!cancelled) setMode(label === 'init-setup' ? 'init' : 'main');
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  if (mode === 'loading') {
    return null;
  }
  if (mode === 'init') {
    return <InitSetupApp />;
  }
  return <App />;
}

// アプリケーションのルート要素を作成し、描画開始
const root = createRoot(document.getElementById('root'));
root.render(<RootApp />);

function normalizeHref(rawHref) {
  const trimmed = String(rawHref || '').trim();
  if (!trimmed) return '';
  try {
    if (/^[a-zA-Z][\w+.-]*:/.test(trimmed)) {
      return new URL(trimmed).toString();
    }
    return new URL(trimmed, window.location.href).toString();
  } catch {
    return trimmed;
  }
}

async function openMarkdownLinkExternally(rawHref) {
  const href = normalizeHref(rawHref);
  if (!href) return;
  try {
    const shell = await import('@tauri-apps/plugin-shell');
    if (typeof shell.open === 'function') {
      await shell.open(href);
      return;
    }
  } catch (err) {
    console.warn('Failed to open link via Tauri shell plugin, falling back to window.open', err);
  }
  try {
    window.open(href, '_blank', 'noopener,noreferrer');
  } catch {
    window.location.href = href;
  }
}
