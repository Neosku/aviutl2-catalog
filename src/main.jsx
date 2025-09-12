import React, { useEffect } from 'react';
import { createRoot } from 'react-dom/client';
import AppRouter from './app/Router.jsx';
import TitleBar from './components/TitleBar.jsx';
import { CatalogProvider, useCatalogDispatch, initCatalog } from './app/store/catalog.jsx';
import { loadInstalledMap, detectInstalledVersionsMap, saveInstalledSnapshot, getSettings, logError } from './app/utils.js';
import './app/styles/index.css';

// アプリケーション初期化コンポーネント
// カタログの読み込み・検出・状態反映を行う起動用コンポーネント
function Bootstrapper() {
  const dispatch = useCatalogDispatch();
  
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

  // Global error handlers to log to app.log
  useEffect(() => {
    const onError = async (e) => { try { await logError(`[window.error] ${e?.message || e}`); } catch (_) {} };
    const onRejection = async (e) => {
      const reason = e?.reason;
      const msg = (reason && (reason.message || (reason.toString && reason.toString()))) || String(reason || 'unhandled rejection');
      try { await logError(`[window.unhandledrejection] ${msg}`); } catch (_) {}
    };
    const origError = console.error;
    console.error = (...args) => { try { origError?.(...args); } catch (_) {} try { logError(`[console.error] ${args.map(a => (a && a.stack) ? a.stack : (a && a.message) ? a.message : String(a)).join(' ')}`); } catch (_) {} };
    window.addEventListener('error', onError);
    window.addEventListener('unhandledrejection', onRejection);
    return () => {
      try { console.error = origError; } catch (_) {}
      window.removeEventListener('error', onError);
      window.removeEventListener('unhandledrejection', onRejection);
    };
  }, []);

  // アプリケーション初期化処理（カタログ読み込み・テーマ適用・インストール状態検出）
  useEffect(() => {
    let cancelled = false;
    (async () => {
      // 設定からテーマを早期に適用
      try {
        const s = await getSettings();
        let theme = (s && s.theme) ? String(s.theme) : '';
        if (theme === 'noir') theme = 'darkmode';
        if (theme === 'lightmode') {
          document.documentElement.setAttribute('data-theme', 'light');
        } else {
          document.documentElement.removeAttribute('data-theme');
        }
      } catch (e) { try { await logError(`[bootstrap] theme apply failed: ${e?.message || e}`); } catch (_) {} }
      
      // Remote catalog URL can be configured via Vite env
      const REMOTE = import.meta.env.VITE_REMOTE;
      
      // キャッシュされたカタログをAppConfigから読み込み
      async function readCache() {
        try {
          const fs = await import('@tauri-apps/plugin-fs');
          const raw = await fs.readTextFile('catalog/index.json', { baseDir: fs.BaseDirectory.AppConfig });
          return JSON.parse(raw);
        } catch (e) { try { await logError(`[bootstrap] readCache failed: ${e?.message || e}`); } catch (_) {} return null; }
      }
      // カタログをAppConfigにJSON形式で保存
      async function writeCache(data) {
        try {
          const fs = await import('@tauri-apps/plugin-fs');
          await fs.mkdir('catalog', { baseDir: fs.BaseDirectory.AppConfig, recursive: true });
          await fs.writeTextFile('catalog/index.json', JSON.stringify(data, null, 2), { baseDir: fs.BaseDirectory.AppConfig });
        } catch (e) { try { await logError(`[bootstrap] writeCache failed: ${e?.message || e}`); } catch (_) {} }
      }
      try {
        // インストール情報を先に読み込んでアイテムを装飾
        const installedMap = await loadInstalledMap();
        if (!cancelled) dispatch({ type: 'SET_INSTALLED_MAP', payload: installedMap });

        // まずリモートからの取得を試行
        let data = null;
        try {
          const ctrl = new AbortController();
          const to = setTimeout(() => ctrl.abort(), 10000);
          const res = await fetch(REMOTE, { signal: ctrl.signal });
          clearTimeout(to);
          if (res.ok) data = await res.json();
        } catch (e) {
          console.warn('Remote catalog fetch failed, will try cache:', e);
        }

        // リモート取得に失敗した場合はキャッシュを使用
        if (!data) {
          data = await readCache();
        }

        if (data) {
          const items = Array.isArray(data) ? data : [];
          if (!cancelled) dispatch({ type: 'SET_ITEMS', payload: items });
          // 高速検索のためにRust側のカタログインデックスを構築
          try {
            const { invoke } = await import('@tauri-apps/api/core');
            await invoke('set_catalog_index', { items });
          } catch (e) { try { await logError(`[bootstrap] set_catalog_index failed: ${e?.message || e}`); } catch (_) {} }
          // ファイルのハッシュでインストール済みバージョンを検出
          try {
            const detected = await detectInstalledVersionsMap(items);
            if (!cancelled) {
              dispatch({ type: 'SET_DETECTED_MAP', payload: detected });
              // 検出結果をinstalled.jsonにスナップショット保存
              try {
                const snap = await saveInstalledSnapshot(detected);
                dispatch({ type: 'SET_INSTALLED_MAP', payload: snap });
              } catch (e) { try { await logError(`[bootstrap] saveInstalledSnapshot failed: ${e?.message || e}`); } catch (_) {} }
            }
          } catch (e) { try { await logError(`[bootstrap] detectInstalledVersionsMap failed: ${e?.message || e}`); } catch (_) {} }
          // キャッシュを利用した場合はバックグラウンドで更新（現状 no-op）
          if (!Array.isArray(data) || data.length === 0) {
            // 何もしません
          }
          // リモート成功時もキャッシュへ書き込み
          writeCache(items);
        } else {
          if (!cancelled) dispatch({ type: 'SET_ERROR', payload: 'カタログの読み込みに失敗しました（ネットワーク/キャッシュなし）。' });
        }
      } catch (e) {
        console.error('Failed to load catalog:', e);
        if (!cancelled) dispatch({ type: 'SET_ERROR', payload: 'カタログの読み込みに失敗しました。' });
      } finally {
        if (!cancelled) dispatch({ type: 'SET_LOADING', payload: false });
      }
    })();
    return () => { cancelled = true; };
  }, [dispatch]);

  // アップデート確認（起動時1回）
  useEffect(() => {
    // 開発モードではアップデートチェックをスキップ
    if (import.meta?.env?.DEV) return;
    let cancelled = false;
    (async () => {
      try {
        const { check } = await import('@tauri-apps/plugin-updater');
        const update = await check();
        // v2 plugin: update?.available が true の場合に更新可能
        if (!cancelled && update && (update.available ?? true)) {
          try {
            const { ask } = await import('@tauri-apps/plugin-dialog');
            const ver = update.version || '';
            const ok = await ask(`新しいバージョン${ver ? ` (${ver})` : ''}が利用可能です。今すぐ更新しますか？`, {
              title: 'アップデート',
              kind: 'info',
              okLabel: '更新',
              cancelLabel: '後で'
            });
            if (ok) {
              await update.downloadAndInstall();
              try {
                const { relaunch } = await import('@tauri-apps/plugin-process');
                await relaunch();
              } catch (e) {
                // relaunch に失敗した場合は再起動を案内
                try {
                  const { message } = await import('@tauri-apps/plugin-dialog');
                  await message('アップデートを適用しました。アプリを再起動してください。', { title: 'アップデート', kind: 'info' });
                } catch (_) {}
              }
            }
          } catch (e) {
            try { await logError(`[updater] prompt/install failed: ${e?.message || e}`); } catch (_) {}
          }
        }
      } catch (e) {
        // check() が未設定やネットワークにより失敗する可能性あり
        try { await logError(`[updater] check failed: ${e?.message || e}`); } catch (_) {}
      }
    })();
    return () => { cancelled = true; };
  }, []);
  return <AppRouter />;
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

// アプリケーションのルート要素を作成し、描画開始
const root = createRoot(document.getElementById('root'));
root.render(<App />);
