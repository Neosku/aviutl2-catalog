import { useEffect } from 'react';
import * as tauriApp from '@tauri-apps/api/app';
import type { Dispatch, SetStateAction } from 'react';
import { logError } from '../../../../utils/logging';
import { getSettings } from '../../../../utils/settings';
import { applyTheme, toErrorMessage, toSettingsForm } from '../../model/helpers';
import type { SettingsFormState } from '../../model/types';

interface UseSettingsInitializationParams {
  setForm: Dispatch<SetStateAction<SettingsFormState>>;
  setInitialPackageStateOptOut: Dispatch<SetStateAction<boolean>>;
  setAppVersion: Dispatch<SetStateAction<string>>;
  setError: Dispatch<SetStateAction<string>>;
}

export default function useSettingsInitialization({
  setForm,
  setInitialPackageStateOptOut,
  setAppVersion,
  setError,
}: UseSettingsInitializationParams) {
  useEffect(() => {
    let mounted = true;
    (async () => {
      setError('');
      try {
        const nextForm = toSettingsForm(await getSettings());
        if (mounted) {
          setForm(nextForm);
          setInitialPackageStateOptOut(nextForm.packageStateOptOut);
          applyTheme(nextForm.theme);
        }
      } catch (settingsError) {
        try {
          await logError(`[settings] getSettings failed: ${toErrorMessage(settingsError, 'unknown')}`);
        } catch {}
      }

      try {
        const version = await tauriApp.getVersion();
        if (mounted) setAppVersion(String(version || ''));
      } catch (versionError) {
        try {
          await logError(`[settings] getVersion failed: ${toErrorMessage(versionError, 'unknown')}`);
        } catch {}
      }
    })();

    return () => {
      mounted = false;
    };
  }, [setAppVersion, setError, setForm, setInitialPackageStateOptOut]);
}
