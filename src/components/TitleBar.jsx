import React, { useEffect, useState } from 'react';
import { logError } from '../app/utils.js';

export default function TitleBar() {
  const [max, setMax] = useState(false);

  async function getWindow() {
    try {
      const mod = await import('@tauri-apps/api/window');
      if (typeof mod.getCurrent === 'function') return mod.getCurrent();
      if (typeof mod.getCurrentWindow === 'function') return mod.getCurrentWindow();
      if (mod?.appWindow) return mod.appWindow;
    } catch (e) { try { await logError(`[titlebar] window module load failed: ${e?.message || e}`); } catch (_) {} }
    try {
      const mod2 = await import('@tauri-apps/api/webviewWindow');
      if (typeof mod2.getCurrent === 'function') return mod2.getCurrent();
    } catch (e) { try { await logError(`[titlebar] webviewWindow module load failed: ${e?.message || e}`); } catch (_) {} }
    return null;
  }

  useEffect(() => {
    (async () => {
      const w = await getWindow();
      try { if (w?.isMaximized) setMax(await w.isMaximized()); } catch (_) {}
    })();
  }, []);

  async function minimize() {
    const w = await getWindow();
    try { await w?.minimize(); } catch (e) { try { await logError(`[titlebar] minimize failed: ${e?.message || e}`); } catch (_) {} }
  }

  async function toggleMaximize() {
    const w = await getWindow();
    try {
      const m = (w?.isMaximized) ? await w.isMaximized() : false;
      if (m) { await w.unmaximize(); setMax(false); }
      else { await w?.maximize(); setMax(true); }
    } catch (e) { try { await logError(`[titlebar] toggleMaximize failed: ${e?.message || e}`); } catch (_) {} }
  }

  async function close() {
    const w = await getWindow();
    try { await w?.close(); } catch (e) { try { await logError(`[titlebar] close failed: ${e?.message || e}`); } catch (_) {} }
  }

  return (
    <div className="titlebar">
      <div className="titlebar__left">
        <span className="titlebar__app">AviUtl2 Catalog</span>
      </div>
      <div className="titlebar__buttons">
        <button className="titlebtn" onClick={minimize} title="最小化" aria-label="最小化">
          <svg width="10" height="10" viewBox="0 0 10 10" aria-hidden><rect x="1.5" y="4.5" width="7" height="1" rx="0.5" fill="currentColor" /></svg>
        </button>
        <button className="titlebtn" onClick={toggleMaximize} onDoubleClick={toggleMaximize} title={max ? '元に戻す' : '最大化'} aria-label="最大化">
          {max ? (
            <svg width="10" height="10" viewBox="0 0 10 10" aria-hidden>
              <rect x="2.3" y="2.3" width="5.4" height="5.4" fill="none" stroke="currentColor" strokeWidth="1" />
            </svg>
          ) : (
            <svg width="10" height="10" viewBox="0 0 10 10" aria-hidden>
              <rect x="1.5" y="1.5" width="7" height="7" fill="none" stroke="currentColor" strokeWidth="1" />
            </svg>
          )}
        </button>
        <button className="titlebtn titlebtn--close" onClick={close} title="閉じる" aria-label="閉じる">
          <svg width="10" height="10" viewBox="0 0 10 10" aria-hidden>
            <path d="M2 2 L8 8 M8 2 L2 8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
        </button>
      </div>
    </div>
  );
}
