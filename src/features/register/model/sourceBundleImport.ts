/**
 * v2 source bundle JSON import utilities.
 */
import { i18n } from '@/i18n';
import {
  sourceContentSchema,
  sourceInstallSchema,
  sourceMetaSchema,
  sourcePackageSchema,
  sourceVersionsSchema,
  type SourceContent,
  type SourcePackage,
} from '@/utils/catalog-schema/source/sourceSchema';
import { sourcePackageToForm } from './parse';
import { commaListToArray, getErrorMessage } from './helpers';
import { captureLocalizedContent } from './localizedContent';
import { SUPPORTED_SOURCE_LOCALES } from './constants';
import type { RegisterPackageForm } from './types';

interface SourceBundleImportPackage {
  packageForm: RegisterPackageForm;
  tags: string[];
}

export interface SourceBundleImportResult {
  packages: SourceBundleImportPackage[];
}

type UnknownRecord = Record<string, unknown>;

function isPlainObject(value: unknown): value is UnknownRecord {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function asPlainRecord(value: unknown): UnknownRecord | null {
  return isPlainObject(value) ? value : null;
}

function isSupportedSourceLocale(locale: string): boolean {
  return SUPPORTED_SOURCE_LOCALES.includes(locale as (typeof SUPPORTED_SOURCE_LOCALES)[number]);
}

function asString(value: unknown): string {
  return typeof value === 'string' ? value : '';
}

function normalizePath(value: string): string {
  return value.trim().replace(/\\/g, '/').replace(/^\.\//, '');
}

function getRecordValue(record: UnknownRecord, keys: string[]): unknown {
  for (const key of keys) {
    if (Object.prototype.hasOwnProperty.call(record, key)) return record[key];
  }
  return undefined;
}

function withInheritedLocale(item: unknown, locale: unknown): unknown {
  if (!isPlainObject(item) || typeof locale !== 'string' || !locale.trim() || item.locale) return item;
  return { ...item, locale };
}

function extractPackageInputs(parsed: unknown): unknown[] {
  if (Array.isArray(parsed)) return parsed;
  if (!isPlainObject(parsed)) {
    throw new Error(i18n.t('register:errors.jsonInvalidInput'));
  }
  const packages = parsed.packages;
  if (Array.isArray(packages)) return packages.map((item) => withInheritedLocale(item, parsed.locale));
  if (isPlainObject(packages)) return Object.values(packages).map((item) => withInheritedLocale(item, parsed.locale));
  return [parsed];
}

function collectLocalizedContent(
  value: unknown,
  requestedLocale: string,
): { activeLocale: string; contents: Record<string, SourceContent> } {
  const fallbackLocale = isSupportedSourceLocale(requestedLocale) ? requestedLocale : 'ja';
  if (!isPlainObject(value)) {
    return { activeLocale: fallbackLocale, contents: { [fallbackLocale]: sourceContentSchema.parse(value) } };
  }
  if (isPlainObject(value.description)) {
    return { activeLocale: fallbackLocale, contents: { [fallbackLocale]: sourceContentSchema.parse(value) } };
  }

  const contents: Record<string, SourceContent> = {};
  for (const [locale, content] of Object.entries(value)) {
    if (isSupportedSourceLocale(locale) && isPlainObject(content)) {
      contents[locale] = sourceContentSchema.parse(content);
    }
  }
  const localeCandidates = [requestedLocale, 'ja', ...Object.keys(contents)].filter(isSupportedSourceLocale);
  const activeLocale = localeCandidates.find((locale) => contents[locale]) || fallbackLocale;
  return { activeLocale, contents };
}

function readMarkdownText(args: {
  bundle: UnknownRecord;
  content: SourceContent;
  contentLocale: string;
  markdownKind: 'description' | 'changelog' | 'notice';
  folderName: 'docs' | 'changelog' | 'notice';
}): string {
  const markdownSource =
    args.markdownKind === 'description'
      ? args.content.description.markdownSource
      : args.content[args.markdownKind]?.markdownSource;
  if (!markdownSource) return '';

  const markdownRecord = asPlainRecord(args.bundle.markdown);
  const directMarkdown = asString(markdownRecord?.[args.markdownKind]);
  if (directMarkdown) return directMarkdown;
  const localizedKindRecord = asPlainRecord(markdownRecord?.[args.markdownKind]);
  const localizedKindMarkdown = asString(localizedKindRecord?.[args.contentLocale]);
  if (localizedKindMarkdown) return localizedKindMarkdown;
  const markdownFolderRecord = asPlainRecord(markdownRecord?.[args.folderName]);
  const markdownFolderText = asString(markdownFolderRecord?.[args.contentLocale]);
  if (markdownFolderText) return markdownFolderText;

  const folderRecord = asPlainRecord(args.bundle[args.folderName]);
  const localizedMarkdown = asString(folderRecord?.[args.contentLocale]);
  if (localizedMarkdown) return localizedMarkdown;

  const normalizedSource = normalizePath(markdownSource);
  const pathCandidates = [
    normalizedSource,
    `${args.folderName}/${args.contentLocale}.md`,
    `${args.folderName}.md`,
  ].filter(Boolean);
  for (const path of pathCandidates) {
    const value = asString(markdownRecord?.[path]) || asString(args.bundle[path]);
    if (value) return value;
  }
  return '';
}

function parseSourceBundlePackage(raw: unknown, requestedLocale: string): SourceBundleImportPackage {
  if (!isPlainObject(raw)) {
    throw new Error(i18n.t('register:errors.jsonInvalidInput'));
  }

  const meta = sourceMetaSchema.parse(getRecordValue(raw, ['meta', 'meta.json']));
  const preferredLocale = asString(raw.locale) || requestedLocale || 'ja';
  const contentInput = getRecordValue(raw, ['content', `content/${preferredLocale}.json`, 'content/ja.json']);
  const collectedContent = collectLocalizedContent(contentInput, preferredLocale);
  if (Object.keys(collectedContent.contents).length === 0) {
    throw new Error(i18n.t('register:errors.jsonInvalidInput'));
  }
  const install = sourceInstallSchema.parse(getRecordValue(raw, ['install', 'install.json']));
  const versions = sourceVersionsSchema.parse(getRecordValue(raw, ['versions', 'versions.json']));
  const localizedContents: RegisterPackageForm['localizedContents'] = {};
  for (const [contentLocale, content] of Object.entries(collectedContent.contents)) {
    const sourcePackage: SourcePackage = sourcePackageSchema.parse({
      meta,
      content,
      install,
      versions,
    });
    const localeForm = sourcePackageToForm({
      sourcePackage,
      locale: contentLocale,
      descriptionMarkdown: readMarkdownText({
        bundle: raw,
        content,
        contentLocale,
        markdownKind: 'description',
        folderName: 'docs',
      }),
      changelogMarkdown: readMarkdownText({
        bundle: raw,
        content,
        contentLocale,
        markdownKind: 'changelog',
        folderName: 'changelog',
      }),
      noticeMarkdown: readMarkdownText({
        bundle: raw,
        content,
        contentLocale,
        markdownKind: 'notice',
        folderName: 'notice',
      }),
    });
    localizedContents[contentLocale] = captureLocalizedContent(localeForm);
  }
  const locale = collectedContent.activeLocale || requestedLocale || 'ja';
  const content = collectedContent.contents[locale];
  if (!content) {
    throw new Error(i18n.t('register:errors.jsonInvalidInput'));
  }
  const sourcePackage: SourcePackage = sourcePackageSchema.parse({
    meta,
    content,
    install,
    versions,
  });
  const form = sourcePackageToForm({
    sourcePackage,
    locale,
    descriptionMarkdown: readMarkdownText({
      bundle: raw,
      content,
      contentLocale: locale,
      markdownKind: 'description',
      folderName: 'docs',
    }),
    changelogMarkdown: readMarkdownText({
      bundle: raw,
      content,
      contentLocale: locale,
      markdownKind: 'changelog',
      folderName: 'changelog',
    }),
    noticeMarkdown: readMarkdownText({
      bundle: raw,
      content,
      contentLocale: locale,
      markdownKind: 'notice',
      folderName: 'notice',
    }),
  });
  form.localizedContents = localizedContents;

  return {
    packageForm: form,
    tags: commaListToArray(form.tagsText),
  };
}

export function importSourceBundleJson(args: { jsonText: string; requestedLocale: string }): SourceBundleImportResult {
  let parsed: unknown;
  try {
    parsed = JSON.parse(args.jsonText);
  } catch (error: unknown) {
    throw new Error(i18n.t('register:errors.jsonParseFailed', { detail: getErrorMessage(error) }), { cause: error });
  }

  const rawPackages = extractPackageInputs(parsed);
  const packages = rawPackages.map((item) => parseSourceBundlePackage(item, args.requestedLocale));
  if (packages.length === 0) {
    throw new Error(i18n.t('register:errors.jsonNoTargets'));
  }
  return { packages };
}
