import type { SupportedUiLocale } from './uiLocale';

export const defaultNS = 'common';
export const namespaces = [
  'common',
  'nav',
  'home',
  'package',
  'updates',
  'settings',
  'feedback',
  'initSetup',
  'links',
  'niconiCommons',
  'register',
] as const;

type NamespaceResource = Record<string, unknown>;

export type LocaleResourceSchema = Record<(typeof namespaces)[number], NamespaceResource>;

export function mergeRegisterResources(
  workflow: NamespaceResource,
  form: NamespaceResource,
  installer: NamespaceResource,
  versions: NamespaceResource,
): NamespaceResource {
  return {
    ...workflow,
    ...form,
    ...installer,
    ...versions,
  };
}

export async function loadLocaleResources(locale: SupportedUiLocale): Promise<LocaleResourceSchema> {
  switch (locale) {
    case 'en':
      return (await import('./locale-resources/en')).default;
    case 'ko':
      return (await import('./locale-resources/ko')).default;
    case 'zh-CN':
      return (await import('./locale-resources/zh-CN')).default;
    case 'zh-TW':
      return (await import('./locale-resources/zh-TW')).default;
    case 'ja':
    default:
      return (await import('./locale-resources/ja')).default;
  }
}
