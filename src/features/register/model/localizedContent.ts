/**
 * Locale-specific source content helpers for the register form.
 */
import { generateKey } from './helpers';
import { SUPPORTED_SOURCE_LOCALES } from './constants';
import type { RegisterCopyright, RegisterLicense, RegisterLocalizedContentForm, RegisterPackageForm } from './types';

function normalizeLocale(locale: string): string {
  return String(locale || '').trim();
}

function isSupportedSourceLocale(locale: string): boolean {
  return SUPPORTED_SOURCE_LOCALES.includes(locale as (typeof SUPPORTED_SOURCE_LOCALES)[number]);
}

function cloneCopyright(copyright: RegisterCopyright): RegisterCopyright {
  return {
    key: String(copyright.key || generateKey()),
    years: String(copyright.years || ''),
    holder: String(copyright.holder || ''),
  };
}

function cloneLicense(license: RegisterLicense): RegisterLicense {
  return {
    key: String(license.key || generateKey()),
    type: license.type || '',
    licenseName: String(license.licenseName || ''),
    isCustom: Boolean(license.isCustom),
    licenseBody: String(license.licenseBody || ''),
    copyrights: Array.isArray(license.copyrights) ? license.copyrights.map(cloneCopyright) : [],
  };
}

export function cloneRegisterLicenses(licenses: RegisterLicense[]): RegisterLicense[] {
  return Array.isArray(licenses) ? licenses.map(cloneLicense) : [];
}

export function captureLocalizedContent(form: RegisterPackageForm): RegisterLocalizedContentForm {
  return {
    name: form.name,
    author: form.author,
    originalAuthor: form.originalAuthor,
    deprecationEnabled: form.deprecationEnabled,
    deprecationMessage: form.deprecationMessage,
    type: form.type,
    summary: form.summary,
    descriptionText: form.descriptionText,
    descriptionPath: form.descriptionPath,
    descriptionMode: form.descriptionMode,
    descriptionUrl: form.descriptionUrl,
    changelogMode: form.changelogMode,
    changelogUrl: form.changelogUrl,
    changelogPath: form.changelogPath,
    changelogText: form.changelogText,
    noticePath: form.noticePath,
    noticeText: form.noticeText,
    licenses: cloneRegisterLicenses(form.licenses),
    tagsText: form.tagsText,
  };
}

function createCopiedLocalizedContentForNewLocale(form: RegisterPackageForm): RegisterLocalizedContentForm {
  return {
    ...captureLocalizedContent(form),
    descriptionPath: '',
    descriptionMode: 'inline',
    descriptionUrl: '',
    changelogPath: '',
    changelogMode: 'inline',
    changelogUrl: '',
    noticePath: '',
  };
}

export function applyLocalizedContent(
  form: RegisterPackageForm,
  content: RegisterLocalizedContentForm,
): RegisterPackageForm {
  return {
    ...form,
    name: content.name,
    author: content.author,
    originalAuthor: content.originalAuthor,
    deprecationEnabled: content.deprecationEnabled,
    deprecationMessage: content.deprecationMessage,
    type: content.type,
    summary: content.summary,
    descriptionText: content.descriptionText,
    descriptionPath: content.descriptionPath,
    descriptionMode: content.descriptionMode,
    descriptionUrl: content.descriptionUrl,
    changelogMode: content.changelogMode,
    changelogUrl: content.changelogUrl,
    changelogPath: content.changelogPath,
    changelogText: content.changelogText,
    noticePath: content.noticePath,
    noticeText: content.noticeText,
    licenses: cloneRegisterLicenses(content.licenses),
    tagsText: content.tagsText,
  };
}

export function storeCurrentLocalizedContent(form: RegisterPackageForm): RegisterPackageForm {
  const locale = normalizeLocale(form.sourceLocale) || 'ja';
  return {
    ...form,
    sourceLocale: locale,
    localizedContents: {
      ...form.localizedContents,
      [locale]: captureLocalizedContent(form),
    },
  };
}

export function getRegisterSourceLocales(form: RegisterPackageForm): string[] {
  const locales = new Set<string>();
  const currentLocale = normalizeLocale(form.sourceLocale);
  if (currentLocale) locales.add(currentLocale);
  Object.keys(form.localizedContents || {}).forEach((locale) => {
    const normalized = normalizeLocale(locale);
    if (normalized && isSupportedSourceLocale(normalized)) locales.add(normalized);
  });
  return Array.from(locales);
}

export function switchRegisterSourceLocale(form: RegisterPackageForm, nextLocaleInput: string): RegisterPackageForm {
  const nextLocale = normalizeLocale(nextLocaleInput);
  if (!nextLocale || !isSupportedSourceLocale(nextLocale)) return form;
  const stored = storeCurrentLocalizedContent(form);
  const nextContent = stored.localizedContents[nextLocale] || createCopiedLocalizedContentForNewLocale(stored);
  const applied = applyLocalizedContent(stored, nextContent);
  return {
    ...applied,
    sourceLocale: nextLocale,
    localizedContents: {
      ...stored.localizedContents,
      [nextLocale]: nextContent,
    },
  };
}
