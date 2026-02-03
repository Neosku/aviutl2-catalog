import React, { useEffect, useState } from 'react';
import { Copy, Minus, Square, X } from 'lucide-react';
import { logError } from '../utils/index.js';

export default function TitleBar() {
  const [max, setMax] = useState(false);

  async function getWindow() {
    try {
      const mod = await import('@tauri-apps/api/window');
      if (typeof mod.getCurrent === 'function') return mod.getCurrent();
      if (typeof mod.getCurrentWindow === 'function') return mod.getCurrentWindow();
      if (mod?.appWindow) return mod.appWindow;
    } catch (e) {
      try {
        await logError(`[titlebar] window module load failed: ${e?.message || e}`);
      } catch (_) {}
    }
    try {
      const mod2 = await import('@tauri-apps/api/webviewWindow');
      if (typeof mod2.getCurrent === 'function') return mod2.getCurrent();
    } catch (e) {
      try {
        await logError(`[titlebar] webviewWindow module load failed: ${e?.message || e}`);
      } catch (_) {}
    }
    return null;
  }

  useEffect(() => {
    let cancelled = false;
    const unlisten = [];
    const syncMax = async (w) => {
      try {
        if (w?.isMaximized && !cancelled) setMax(await w.isMaximized());
      } catch (_) {}
    };

    (async () => {
      const w = await getWindow();
      await syncMax(w);
      const subscribe = async (fn) => {
        if (typeof fn !== 'function') return;
        try {
          const off = await fn(syncMax.bind(null, w));
          if (typeof off === 'function') unlisten.push(off);
        } catch (_) {}
      };
      await subscribe(w?.onResized?.bind(w));
      await subscribe(w?.onMoved?.bind(w));
      await subscribe(w?.onFocusChanged?.bind(w));
      await subscribe(w?.onScaleChanged?.bind(w));
      if (typeof window !== 'undefined' && window.addEventListener) {
        const onResize = () => {
          syncMax(w);
        };
        window.addEventListener('resize', onResize);
        unlisten.push(() => window.removeEventListener('resize', onResize));
      }
    })();

    return () => {
      cancelled = true;
      unlisten.forEach((off) => {
        try {
          off();
        } catch (_) {}
      });
    };
  }, []);

  async function minimize() {
    const w = await getWindow();
    try {
      await w?.minimize();
    } catch (e) {
      try {
        await logError(`[titlebar] minimize failed: ${e?.message || e}`);
      } catch (_) {}
    }
  }

  async function toggleMaximize() {
    const w = await getWindow();
    try {
      const m = w?.isMaximized ? await w.isMaximized() : false;
      if (m) {
        await w.unmaximize();
        setMax(false);
      } else {
        await w?.maximize();
        setMax(true);
      }
    } catch (e) {
      try {
        await logError(`[titlebar] toggleMaximize failed: ${e?.message || e}`);
      } catch (_) {}
    }
  }

  async function close() {
    const w = await getWindow();
    try {
      await w?.close();
    } catch (e) {
      try {
        await logError(`[titlebar] close failed: ${e?.message || e}`);
      } catch (_) {}
    }
  }

  async function startDragIfAllowed(event) {
    if (event.button !== 0) return;
    const target = event.target;
    if (target?.closest?.('[data-no-drag="true"]')) return;
    const w = await getWindow();
    if (!w?.startDragging) return;
    try {
      event.preventDefault();
      await w.startDragging();
    } catch (e) {
      try {
        await logError(`[titlebar] startDragging failed: ${e?.message || e}`);
      } catch (_) {}
    }
  }

  async function handleDoubleClick(event) {
    const target = event.target;
    if (target?.closest?.('[data-no-drag="true"]')) return;
    await toggleMaximize();
  }

  const baseBtn = 'h-8 w-12 flex items-center justify-center text-slate-600 dark:text-slate-300 transition-colors';
  const controlBtn = 'hover:bg-slate-200 dark:hover:bg-slate-800 active:bg-slate-300 dark:active:bg-slate-700';

  return (
    <div
      className="flex h-8 w-full flex-none items-stretch justify-between bg-slate-100 dark:bg-slate-900 text-slate-700 dark:text-slate-200 pl-2 pr-0 select-none"
      data-tauri-drag-region
      style={{ WebkitAppRegion: 'drag' }}
      onPointerDown={startDragIfAllowed}
      onDoubleClick={handleDoubleClick}
    >
      <div className="text-xs font-semibold tracking-wide flex items-center" data-tauri-drag-region>
        AviUtl2 Catalog
      </div>
      <div
        className="flex items-stretch"
        data-tauri-drag-region="false"
        data-no-drag="true"
        style={{ WebkitAppRegion: 'no-drag' }}
      >
        <button
          className={`${baseBtn} ${controlBtn}`}
          onClick={minimize}
          title="最小化"
          aria-label="最小化"
          type="button"
          style={{ WebkitAppRegion: 'no-drag' }}
        >
          <Minus size={14} />
        </button>
        <button
          className={`${baseBtn} ${controlBtn}`}
          onClick={toggleMaximize}
          onDoubleClick={toggleMaximize}
          title={max ? '元に戻す' : '最大化'}
          aria-label="最大化"
          type="button"
          style={{ WebkitAppRegion: 'no-drag' }}
        >
          {max ? <Copy size={13} /> : <Square size={13} />}
        </button>
        <button
          className={`${baseBtn} hover:bg-red-600 hover:text-white active:bg-red-700`}
          onClick={close}
          title="閉じる"
          aria-label="閉じる"
          type="button"
          style={{ WebkitAppRegion: 'no-drag' }}
        >
          <X size={14} />
        </button>
      </div>
    </div>
  );
}
