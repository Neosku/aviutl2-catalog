import { useEffect } from 'react';
import * as tauriApp from '@tauri-apps/api/app';
import { useTranslation } from 'react-i18next';
import type { Dispatch, SetStateAction } from 'react';
import { changeUiLocale, getCurrentUiLocale } from '@/i18n';
import { logError } from '@/utils/logging';
import { getSettings } from '@/utils/settings';
import { applyTheme, toErrorMessage, toSettingsForm } from '../../model/helpers';
import type { SettingsFormState } from '../../model/types';

interface UseSettingsInitializationParams {
  setForm: Dispatch<SetStateAction<SettingsFormState>>;
  setInitialPackageStateOptOut: Dispatch<SetStateAction<boolean>>;
  setAppVersion: Dispatch<SetStateAction<string>>;
  setError: Dispatch<SetStateAction<string>>;
  setInitialized: Dispatch<SetStateAction<boolean>>;
}

export default function useSettingsInitialization({
  setForm,
  setInitialPackageStateOptOut,
  setAppVersion,
  setError,
  setInitialized,
}: UseSettingsInitializationParams) {
  const { i18n } = useTranslation();

  useEffect(() => {
    let mounted = true;
    (async () => {
      setError('');
      try {
        const currentLocale = getCurrentUiLocale(i18n);
        const nextForm = toSettingsForm(await getSettings(), currentLocale);
        if (mounted) {
          setForm(nextForm);
          setInitialPackageStateOptOut(nextForm.packageStateOptOut);
          applyTheme(nextForm.theme);
          setInitialized(true);
        }
        await changeUiLocale(nextForm.locale);
      } catch (settingsError) {
        if (mounted) setInitialized(true);
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
  }, [i18n, setAppVersion, setError, setForm, setInitialPackageStateOptOut, setInitialized]);
}
