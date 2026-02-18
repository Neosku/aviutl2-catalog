import { useEffect } from 'react';
import type { Dispatch, SetStateAction } from 'react';
import { getSettings, logError } from '../../../../utils/index.js';
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
        const app = await import('@tauri-apps/api/app');
        const version = app?.getVersion ? await app.getVersion() : '';
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
