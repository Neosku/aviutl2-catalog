import { useCallback, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { logError } from '../utils/index.js';

// deeplink用のカスタムスキーム（判別用）
const DEEP_LINK_SCHEME = 'aviutl2-catalog';

// scheme://host/path を内部ルーティングのパスに変換
function buildInternalPath(url) {
  const segments = [];
  const host = url.hostname || '';
  if (host) segments.push(host);
  const rawPath = url.pathname || '';
  const trimmedPath = rawPath.replace(/^\/+/, '').replace(/\/+$/, '');
  if (trimmedPath) segments.push(trimmedPath);
  const joined = segments.join('/');
  return joined ? `/${joined}` : '/';
}

// /home を / に正規化し、末尾スラッシュを除去
function normalizeInternalPath(path) {
  if (!path) return '/';
  let normalized = path.startsWith('/') ? path : `/${path}`;
  if (normalized !== '/') normalized = normalized.replace(/\/+$/, '');
  if (normalized === '/home') return '/';
  return normalized || '/';
}

// deepkinkURLを解析して内部遷移情報に変換
function parseDeepLink(rawUrl) {
  if (typeof rawUrl !== 'string') return null;
  const trimmed = rawUrl.trim();
  if (!trimmed) return null;
  let url;
  try {
    url = new URL(trimmed);
  } catch {
    return null;
  }
  if (url.protocol !== `${DEEP_LINK_SCHEME}:`) return null;
  const internalPath = normalizeInternalPath(buildInternalPath(url));
  const internalUrl = `${internalPath}${url.search || ''}${url.hash || ''}`;
  const installRequested = url.searchParams.get('install') === 'true';
  const match = internalPath.match(/^\/package\/([^/?#]+)/);
  let packageId = null;
  if (match) {
    try {
      packageId = decodeURIComponent(match[1]);
    } catch {
      packageId = match[1];
    }
  }
  return { rawUrl: trimmed, internalPath, internalUrl, installRequested, packageId };
}

// 特定の内部ルートのみ許可
function isAllowedInternalPath(path) {
  if (path === '/' || path === '/updates' || path === '/register') return true;
  if (path.startsWith('/package/')) return true;
  return false;
}

// deeplink受け取り時にウィンドウを前面化
async function bringWindowToFront() {
  try {
    const mod = await import('@tauri-apps/api/window');
    const getCurrent =
      typeof mod.getCurrent === 'function'
        ? mod.getCurrent
        : typeof mod.getCurrentWindow === 'function'
          ? mod.getCurrentWindow
          : null;
    const win = getCurrent ? getCurrent() : mod.appWindow || null;
    if (!win) return;
    if (typeof win.show === 'function') await win.show();
    if (typeof win.setFocus === 'function') await win.setFocus();
  } catch {}
}

export default function DeepLinkHandler() {
  const navigate = useNavigate();
  const navigateRef = useRef(navigate);
  // URLの連続受信を抑制
  const recentUrlsRef = useRef(new Map());
  useEffect(() => {
    navigateRef.current = navigate;
  }, [navigate]);
  // 受信したdeeplink群を処理
  const handleUrls = useCallback((urls) => {
    if (!Array.isArray(urls)) return;
    const now = Date.now();
    urls.forEach((raw) => {
      if (typeof raw !== 'string') return;
      const trimmed = raw.trim();
      if (!trimmed) return;
      const recent = recentUrlsRef.current;
      const lastSeen = recent.get(trimmed);
      // 短時間で同一URLが来たら無視
      if (lastSeen && now - lastSeen < 1200) return;
      recent.set(trimmed, now);
      // 古い履歴は削除
      for (const [key, ts] of recent) {
        if (now - ts > 10000) recent.delete(key);
      }
      const action = parseDeepLink(trimmed);
      if (!action) return;
      if (!isAllowedInternalPath(action.internalPath)) {
        void logError(`[deep-link] ignored path=${action.internalPath}`).catch(() => {});
        return;
      }
      void bringWindowToFront(); // 最前面化
      try {
        navigateRef.current(action.internalUrl);
      } catch {}
    });
  }, []);

  useEffect(() => {
    let unlisten;
    let cancelled = false;
    (async () => {
      try {
        const mod = await import('@tauri-apps/plugin-deep-link');
        if (typeof mod.getCurrent === 'function') {
          const current = await mod.getCurrent();
          if (cancelled) return;
          if (Array.isArray(current)) {
            handleUrls(current);
          } else if (typeof current === 'string') {
            handleUrls([current]);
          }
        }
        if (typeof mod.onOpenUrl === 'function') {
          unlisten = await mod.onOpenUrl((urls) => {
            if (cancelled) return;
            if (Array.isArray(urls)) {
              handleUrls(urls);
            } else if (typeof urls === 'string') {
              handleUrls([urls]);
            }
          });
        }
      } catch {}
    })();
    return () => {
      cancelled = true;
      if (typeof unlisten === 'function') unlisten();
    };
  }, [handleUrls]);

  return null;
}
