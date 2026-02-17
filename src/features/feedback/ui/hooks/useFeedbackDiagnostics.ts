import { useEffect, useState } from 'react';
import { toInstalledPackages } from '../../model/helpers';
import type { DeviceInfo, FeedbackDiagnosticsState, FeedbackMode } from '../../model/types';
import { collectDeviceInfo, loadInstalledMap, readAppLog } from '../../../../utils/index.js';

async function loadAppVersion() {
  try {
    const app = await import('@tauri-apps/api/app');
    const version = app?.getVersion ? await app.getVersion() : '';
    return String(version || '');
  } catch {
    return '';
  }
}

export default function useFeedbackDiagnostics(mode: FeedbackMode): FeedbackDiagnosticsState {
  const [device, setDevice] = useState<DeviceInfo | null>(null);
  const [installedPackages, setInstalledPackages] = useState<string[]>([]);
  const [appLog, setAppLog] = useState('');
  const [appVersion, setAppVersion] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (mode !== 'bug') {
      setLoading(false);
      return undefined;
    }

    let cancelled = false;
    const setIfActive = <T>(setter: (value: T) => void, value: T) => {
      if (cancelled) return;
      setter(value);
    };

    const loadDiagnostics = async () => {
      setLoading(true);
      const deviceInfo = await collectDeviceInfo().catch(() => null);
      setIfActive(setDevice, (deviceInfo || null) as DeviceInfo | null);

      const version = await loadAppVersion();
      setIfActive(setAppVersion, version);

      const installedMap = await loadInstalledMap().catch(() => null);
      setIfActive(setInstalledPackages, toInstalledPackages(installedMap));

      const appLogText = await readAppLog().catch(() => '');
      setIfActive(setAppLog, appLogText || '');

      setIfActive(setLoading, false);
    };

    void loadDiagnostics();
    return () => {
      cancelled = true;
    };
  }, [mode]);

  return {
    device,
    installedPackages,
    appLog,
    appVersion,
    loading,
  };
}
