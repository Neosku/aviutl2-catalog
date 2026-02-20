import { useCallback, useEffect, useRef, useState } from 'react';
import { getCurrentTauriWindow, reportTitleBarActionError } from './windowApi';
import type { TauriWindowLike } from './windowApi';

export interface UseTitleBarWindowResult {
  max: boolean;
  minimize: () => Promise<void>;
  toggleMaximize: () => Promise<void>;
  closeWindow: () => Promise<void>;
  startDragging: () => Promise<void>;
}

export default function useTitleBarWindow(): UseTitleBarWindowResult {
  const [max, setMax] = useState(false);
  const windowRef = useRef<TauriWindowLike | null>(null);
  const disposedRef = useRef(false);

  const ensureWindow = useCallback(async (): Promise<TauriWindowLike | null> => {
    if (windowRef.current) return windowRef.current;
    windowRef.current = await getCurrentTauriWindow();
    return windowRef.current;
  }, []);

  const syncMax = useCallback(
    async (windowLike?: TauriWindowLike | null): Promise<void> => {
      const windowObject = windowLike ?? (await ensureWindow());
      if (!windowObject?.isMaximized || disposedRef.current) return;

      try {
        const isMaximized = await windowObject.isMaximized();
        if (!disposedRef.current) setMax(isMaximized);
      } catch (error) {
        await reportTitleBarActionError('sync maximize state', error);
      }
    },
    [ensureWindow],
  );

  useEffect(() => {
    const unlisten: Array<() => void> = [];
    disposedRef.current = false;

    const subscribe = async (
      windowObject: TauriWindowLike,
      listener: ((handler: () => void | Promise<void>) => Promise<(() => void) | void>) | undefined,
    ): Promise<void> => {
      if (typeof listener !== 'function') return;
      try {
        const off = await listener(() => syncMax(windowObject));
        if (typeof off === 'function') unlisten.push(off);
      } catch (error) {
        await reportTitleBarActionError('subscribe window event', error);
      }
    };

    (async () => {
      const windowObject = await ensureWindow();
      if (!windowObject || disposedRef.current) return;

      await syncMax(windowObject);
      await subscribe(windowObject, windowObject.onResized?.bind(windowObject));
      await subscribe(windowObject, windowObject.onMoved?.bind(windowObject));
      await subscribe(windowObject, windowObject.onFocusChanged?.bind(windowObject));
      await subscribe(windowObject, windowObject.onScaleChanged?.bind(windowObject));

      if (typeof window !== 'undefined' && window.addEventListener) {
        const onResize = () => {
          void syncMax(windowObject);
        };
        window.addEventListener('resize', onResize);
        unlisten.push(() => window.removeEventListener('resize', onResize));
      }
    })();

    return () => {
      disposedRef.current = true;
      unlisten.forEach((off) => {
        try {
          off();
        } catch {}
      });
    };
  }, [ensureWindow, syncMax]);

  const minimize = useCallback(async (): Promise<void> => {
    const windowObject = await ensureWindow();
    if (!windowObject?.minimize) return;
    try {
      await windowObject.minimize();
    } catch (error) {
      await reportTitleBarActionError('minimize', error);
    }
  }, [ensureWindow]);

  const toggleMaximize = useCallback(async (): Promise<void> => {
    const windowObject = await ensureWindow();
    if (!windowObject) return;

    try {
      const isMaximized = windowObject.isMaximized ? await windowObject.isMaximized() : false;
      if (isMaximized) {
        await windowObject.unmaximize?.();
        setMax(false);
      } else {
        await windowObject.maximize?.();
        setMax(true);
      }
    } catch (error) {
      await reportTitleBarActionError('toggleMaximize', error);
    }
  }, [ensureWindow]);

  const closeWindow = useCallback(async (): Promise<void> => {
    const windowObject = await ensureWindow();
    if (!windowObject?.close) return;
    try {
      await windowObject.close();
    } catch (error) {
      await reportTitleBarActionError('close', error);
    }
  }, [ensureWindow]);

  const startDragging = useCallback(async (): Promise<void> => {
    const windowObject = await ensureWindow();
    if (!windowObject?.startDragging) return;
    try {
      await windowObject.startDragging();
    } catch (error) {
      await reportTitleBarActionError('startDragging', error);
    }
  }, [ensureWindow]);

  return { max, minimize, toggleMaximize, closeWindow, startDragging };
}
