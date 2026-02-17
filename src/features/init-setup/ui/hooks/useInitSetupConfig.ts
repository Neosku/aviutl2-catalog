import { useEffect, useState } from 'react';
import { safeLog } from '../../model/helpers';
import type { SetupConfig } from '../../model/types';

const SETUP_REMOTE_URL = import.meta.env.VITE_SETUP_REMOTE;

export default function useInitSetupConfig() {
  const [setupConfig, setSetupConfig] = useState<SetupConfig | null>(null);
  const [setupError, setSetupError] = useState('');

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const response = await fetch(SETUP_REMOTE_URL, { cache: 'no-store' });
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const data = (await response.json()) as { corePackageId?: unknown; requiredPluginIds?: unknown };
        const corePackageId = typeof data?.corePackageId === 'string' ? data.corePackageId.trim() : '';
        const requiredPluginIds = Array.isArray(data?.requiredPluginIds)
          ? data.requiredPluginIds.map((id) => String(id).trim()).filter(Boolean)
          : [];
        if (!corePackageId || requiredPluginIds.length === 0) {
          throw new Error('invalid payload');
        }
        if (cancelled) return;
        setSetupConfig({ corePackageId, requiredPluginIds });
        setSetupError('');
      } catch (fetchError) {
        if (!cancelled) {
          setSetupConfig(null);
          setSetupError('インターネットに接続してください。');
        }
        await safeLog('[init-window] setup config load failed', fetchError);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const requiredPluginIds = setupConfig?.requiredPluginIds ?? [];
  const corePackageId = setupConfig?.corePackageId ?? '';

  return {
    setupConfig,
    setupError,
    requiredPluginIds,
    corePackageId,
  };
}
