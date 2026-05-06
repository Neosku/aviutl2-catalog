import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import { getSettings } from '@/utils/settings';
import { defaultNS, loadLocaleResources, namespaces } from './resources';
import { normalizeUiLocale, SUPPORTED_UI_LOCALES, type SupportedUiLocale } from './uiLocale';
type I18nLanguageSource = Pick<typeof i18n, 'resolvedLanguage' | 'language'>;

function applyDocumentLanguage(locale: string): void {
  if (typeof document === 'undefined') return;
  document.documentElement.lang = locale;
}

export function getCurrentUiLocale(source: I18nLanguageSource = i18n): SupportedUiLocale {
  return normalizeUiLocale(source.resolvedLanguage ?? source.language);
}

async function ensureLocaleResources(locale: SupportedUiLocale): Promise<void> {
  if (namespaces.every((namespace) => i18n.hasResourceBundle(locale, namespace))) return;

  const localeResources = await loadLocaleResources(locale);
  namespaces.forEach((namespace) => {
    i18n.addResourceBundle(locale, namespace, localeResources[namespace], true, true);
  });
}

export async function changeUiLocale(locale: SupportedUiLocale): Promise<void> {
  if (getCurrentUiLocale(i18n) === locale) return;
  await ensureLocaleResources(locale);
  // eslint-disable-next-line import/no-named-as-default-member
  await i18n.changeLanguage(locale);
  applyDocumentLanguage(locale);
}

function resolveInitialLanguage(settingsLocale: unknown): SupportedUiLocale {
  const saved = typeof settingsLocale === 'string' ? settingsLocale.trim() : '';
  if (saved) return normalizeUiLocale(saved);

  const browserLocale =
    navigator.languages?.map((value) => value.trim()).find(Boolean) ??
    (typeof navigator.language === 'string' ? navigator.language.trim() : '');

  return normalizeUiLocale(browserLocale || 'ja');
}

export async function initializeI18n(): Promise<typeof i18n> {
  if (i18n.isInitialized) return i18n;

  let settingsLocale = '';
  try {
    settingsLocale = (await getSettings()).locale ?? '';
  } catch {}

  const initialLanguage = resolveInitialLanguage(settingsLocale);
  const initialResources = await loadLocaleResources(initialLanguage);

  // eslint-disable-next-line import/no-named-as-default-member
  await i18n.use(initReactI18next).init({
    resources: {
      [initialLanguage]: initialResources,
    },
    lng: initialLanguage,
    fallbackLng: 'ja',
    supportedLngs: [...SUPPORTED_UI_LOCALES],
    load: 'currentOnly',
    defaultNS,
    ns: [...namespaces],
    interpolation: {
      escapeValue: false,
    },
    react: {
      useSuspense: false,
    },
  });

  applyDocumentLanguage(getCurrentUiLocale(i18n));
  return i18n;
}

export { getUiLocaleLabel, normalizeUiLocale, SUPPORTED_UI_LOCALES, UI_LOCALE_OPTIONS } from './uiLocale';
export { i18n };
export type { SupportedUiLocale, UiLocaleOption } from './uiLocale';
