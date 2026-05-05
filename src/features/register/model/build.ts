/**
 * 入力状態を API 送信用ペイロードへ構築するモジュール
 */
import { arrayToCommaList, commaListToArray, isHttpsUrl, normalizeArrayText } from './helpers';
import { SUPPORTED_SOURCE_LOCALES } from './constants';
import { buildInstallerSource, serializeInstallStep, serializeUninstallStep } from './installerRules';
import { getFileExtension } from './parse';
import { captureLocalizedContent } from './localizedContent';
import { computeRegisterRelevantHash } from './registerTestRequirement';
import type {
  RegisterCatalogItem,
  RegisterInstallerTestItem,
  RegisterLicense,
  RegisterLocalizedContentForm,
  RegisterPackageForm,
} from './types';
import { catalogPackageTypeSchema, type CatalogPackageType } from '@/utils/catalog-schema/shared/commonSchema';
import type { CatalogLicense } from '@/utils/catalog-schema/shared/licenseSchema';
import type { CatalogVersion } from '@/utils/catalog-schema/shared/versionSchema';
import type { Installer } from '@/utils/installer/types';
import {
  sourceContentSchema,
  sourceInstallSchema,
  sourceMetaSchema,
  sourceVersionsSchema,
  type SourceContent,
} from '@/utils/catalog-schema/source/sourceSchema';
import { splitPackageId } from '@/utils/catalog-schema/utils/packageId';
import { isUrlLike, joinPath } from '@/utils/catalog-schema/utils/pathUtils';
import { i18n } from '@/i18n';
import { ipc } from '@/utils/invokeIpc';
import {
  isOtherRegisterLicenseType,
  isUnknownRegisterLicenseType,
  LICENSE_TEMPLATE_TYPE_VALUES,
} from '@/utils/licenseTemplates';

const SOURCE_LICENSE_TEMPLATE_TYPES = new Set<string>(LICENSE_TEMPLATE_TYPE_VALUES);

export interface RegisterSourceSubmitFile {
  path: string;
  file: Blob | File;
}

export interface RegisterSourceSubmitPayload {
  sourceFiles: RegisterSourceSubmitFile[];
  sourcePaths: string[];
}

export function buildInstallerPayload(form: RegisterPackageForm): Installer {
  const source = buildInstallerSource(form.installer);
  return {
    source,
    installSteps: form.installer.installSteps.map(serializeInstallStep),
    uninstallSteps: form.installer.uninstallSteps.map(serializeUninstallStep),
  };
}

function buildVersionPayload(form: RegisterPackageForm): CatalogVersion[] {
  return form.versions.map((ver) => ({
    version: ver.version.trim(),
    releaseDate: ver.releaseDate.trim(),
    files: ver.files.map((f) => ({
      path: f.path.trim(),
      xxh128: f.xxh128.trim(),
    })),
  }));
}

function buildSourceLicensesPayload(licenses: RegisterLicense[]): CatalogLicense[] {
  return licenses
    .map((license): CatalogLicense | null => {
      const rawType = String(license.type || '').trim();
      const licenseName = String(license.licenseName || '').trim();
      const licenseBody = String(license.licenseBody || '').trim();
      const copyrights = license.copyrights
        .map((c) => ({
          years: c.years.trim(),
          holder: c.holder.trim(),
        }))
        .filter((c) => c.years && c.holder);

      if (!rawType) return null;
      if (isUnknownRegisterLicenseType(rawType)) {
        return { type: 'unknown' };
      }
      if (isOtherRegisterLicenseType(rawType)) {
        if (!licenseBody) return null;
        return {
          type: 'custom',
          ...(licenseName ? { name: licenseName } : {}),
          licenseBody,
        };
      }
      if (license.isCustom || licenseBody) {
        return {
          type: 'custom',
          name: licenseName || rawType,
          licenseBody,
        };
      }
      if (!SOURCE_LICENSE_TEMPLATE_TYPES.has(rawType)) {
        return null;
      }
      return {
        type: rawType,
        ...(copyrights.length ? { copyrights } : {}),
      } as CatalogLicense;
    })
    .filter((value): value is CatalogLicense => value !== null);
}

function normalizeSourcePackageType(value: unknown): CatalogPackageType {
  const raw = String(value || '').trim();
  const direct = catalogPackageTypeSchema.safeParse(raw);
  if (direct.success) return direct.data;

  const localizedTypes: Array<[CatalogPackageType, string]> = [
    ['core', 'core'],
    ['mod', 'mod'],
    ['inputPlugin', 'inputPlugin'],
    ['outputPlugin', 'outputPlugin'],
    ['generalPlugin', 'generalPlugin'],
    ['filterPlugin', 'filterPlugin'],
    ['script', 'script'],
  ];
  for (const [type, translationKey] of localizedTypes) {
    if (raw === i18n.t(`common:packageTypes.${translationKey}`)) {
      return type;
    }
  }
  return 'custom';
}

function resolveSourceLocale(form: RegisterPackageForm, fallbackLocale: string): string {
  const sourceLocale = form.sourceLocale.trim();
  if (SUPPORTED_SOURCE_LOCALES.includes(sourceLocale as (typeof SUPPORTED_SOURCE_LOCALES)[number])) return sourceLocale;
  const locale = fallbackLocale.trim();
  if (SUPPORTED_SOURCE_LOCALES.includes(locale as (typeof SUPPORTED_SOURCE_LOCALES)[number])) return locale;
  return 'ja';
}

function buildPackageSourceBasePath(packageId: string): string {
  const parts = splitPackageId(packageId);
  if (!parts) {
    throw new Error(i18n.t('register:errors.packageIdInvalidDetail', { packageId }));
  }
  return `packages/${parts.namespace}/${parts.packageSlug}`;
}

function resolveSourceMarkdownUploadPath(basePath: string, markdownSource: string): string {
  const source = markdownSource.trim();
  if (!source || isUrlLike(source)) {
    return '';
  }
  const normalizedBase = basePath.replace(/\\/g, '/').replace(/\/+$/, '');
  const normalizedSource = source.replace(/\\/g, '/');
  if (normalizedSource.startsWith('./')) {
    return joinPath(normalizedBase, normalizedSource.slice(2)).replace(/\\/g, '/');
  }
  if (normalizedSource.startsWith('/')) {
    return normalizedSource.replace(/^\/+/, '');
  }
  if (normalizedSource.startsWith('packages/')) {
    return normalizedSource;
  }
  return joinPath(normalizedBase, normalizedSource).replace(/\\/g, '/');
}

function createJsonFile(data: unknown): Blob {
  return new Blob([`${JSON.stringify(data, null, 2)}\n`], { type: 'application/json' });
}

function createMarkdownFile(text: string): Blob {
  return new Blob([text], { type: 'text/markdown' });
}

function appendSourceFile(list: RegisterSourceSubmitFile[], path: string, file: Blob | File): void {
  list.push({ path, file });
}

function buildSourceImagePayload(
  form: RegisterPackageForm,
  basePath: string,
  sourceFiles: RegisterSourceSubmitFile[],
): { thumbnail?: string; detailImages?: string[] } | undefined {
  const images: { thumbnail?: string; detailImages?: string[] } = {};
  if (form.images.thumbnail) {
    if (form.images.thumbnail.file) {
      const ext = getFileExtension(form.images.thumbnail.file.name) || 'png';
      const relativePath = `./images/thumbnail.${ext}`;
      images.thumbnail = relativePath;
      appendSourceFile(sourceFiles, `${basePath}/images/thumbnail.${ext}`, form.images.thumbnail.file);
    } else if (form.images.thumbnail.existingPath) {
      images.thumbnail = form.images.thumbnail.existingPath;
    }
  }

  const detailImages: string[] = [];
  form.images.info.forEach((entry, index) => {
    if (entry.file) {
      const ext = getFileExtension(entry.file.name) || 'png';
      const relativePath = `./images/detail-${index + 1}.${ext}`;
      detailImages.push(relativePath);
      appendSourceFile(sourceFiles, `${basePath}/images/detail-${index + 1}.${ext}`, entry.file);
      return;
    }
    if (entry.existingPath) {
      detailImages.push(entry.existingPath);
    }
  });
  if (detailImages.length) {
    images.detailImages = detailImages;
  }

  return images.thumbnail || images.detailImages?.length ? images : undefined;
}

export function computeLatestVersion(form: RegisterPackageForm): string {
  if (!form.versions.length) return '';
  const last = form.versions[form.versions.length - 1];
  return last.version.trim();
}

function getCurrentLocalizedContent(form: RegisterPackageForm, tags: string[]): RegisterLocalizedContentForm {
  return {
    ...captureLocalizedContent(form),
    tagsText: arrayToCommaList(normalizeArrayText(tags)),
  };
}

function buildLocalizedSourceContent(args: {
  localized: RegisterLocalizedContentForm;
  locale: string;
  imagePayload: { thumbnail?: string; detailImages?: string[] } | undefined;
}): SourceContent {
  const { localized, locale, imagePayload } = args;
  const packageType = normalizeSourcePackageType(localized.type);
  const typeLabel = packageType === 'custom' ? localized.type.trim() : '';
  const descriptionMode = localized.descriptionMode === 'external' ? 'external' : 'inline';
  const externalDescriptionUrl = localized.descriptionUrl.trim();
  const useExternalDescription = descriptionMode === 'external' && isHttpsUrl(externalDescriptionUrl);
  const descriptionMarkdownSource = useExternalDescription ? externalDescriptionUrl : `./docs/${locale}.md`;
  const originalAuthor = localized.originalAuthor.trim();
  const deprecationMessage = localized.deprecationEnabled ? localized.deprecationMessage.trim() : '';
  const changelogMode = localized.changelogMode === 'external' ? 'external' : 'inline';
  const externalChangelogUrl = localized.changelogUrl.trim();
  const useExternalChangelog = changelogMode === 'external' && isHttpsUrl(externalChangelogUrl);
  const inlineChangelogPath = localized.changelogPath.trim();
  const existingInlineChangelogPath = inlineChangelogPath && !isUrlLike(inlineChangelogPath) ? inlineChangelogPath : '';
  const changelogMarkdownSource = useExternalChangelog
    ? externalChangelogUrl
    : changelogMode === 'external'
      ? ''
      : existingInlineChangelogPath || (localized.changelogText.trim() ? `./changelog/${locale}.md` : '');
  const noticeMarkdownSource =
    localized.noticePath.trim() || (localized.noticeText.trim() ? `./notice/${locale}.md` : '');

  return sourceContentSchema.parse({
    name: localized.name.trim(),
    author: localized.author.trim(),
    ...(originalAuthor ? { originalAuthor } : {}),
    tags: commaListToArray(localized.tagsText),
    ...(typeLabel ? { typeLabel } : {}),
    description: {
      summary: localized.summary.trim(),
      markdownSource: descriptionMarkdownSource,
    },
    ...(changelogMarkdownSource ? { changelog: { markdownSource: changelogMarkdownSource } } : {}),
    ...(noticeMarkdownSource ? { notice: { markdownSource: noticeMarkdownSource } } : {}),
    ...(deprecationMessage ? { deprecation: { message: deprecationMessage } } : {}),
    licenses: buildSourceLicensesPayload(localized.licenses),
    ...(imagePayload ? { images: imagePayload } : {}),
  });
}

function appendLocalizedMarkdownFiles(args: {
  sourceFiles: RegisterSourceSubmitFile[];
  basePath: string;
  content: SourceContent;
  localized: RegisterLocalizedContentForm;
}): void {
  const descriptionUploadPath = resolveSourceMarkdownUploadPath(args.basePath, args.content.description.markdownSource);
  if (descriptionUploadPath) {
    appendSourceFile(args.sourceFiles, descriptionUploadPath, createMarkdownFile(args.localized.descriptionText || ''));
  }
  const changelogMarkdownSource = args.content.changelog?.markdownSource ?? '';
  const changelogUploadPath = resolveSourceMarkdownUploadPath(args.basePath, changelogMarkdownSource);
  if (changelogUploadPath && changelogMarkdownSource) {
    appendSourceFile(args.sourceFiles, changelogUploadPath, createMarkdownFile(args.localized.changelogText));
  }
  const noticeMarkdownSource = args.content.notice?.markdownSource ?? '';
  const noticeUploadPath = resolveSourceMarkdownUploadPath(args.basePath, noticeMarkdownSource);
  if (noticeUploadPath && noticeMarkdownSource) {
    appendSourceFile(args.sourceFiles, noticeUploadPath, createMarkdownFile(args.localized.noticeText));
  }
}

function toFiniteNumber(value: unknown, fallback = 0): number {
  const num = Number(value);
  return Number.isFinite(num) ? num : fallback;
}

export async function computeHashFromFile(filePath: string): Promise<string> {
  if (!filePath) return '';
  const hex = await ipc.calcXxh3Hex({ path: filePath });
  if (!hex || typeof hex !== 'string') {
    throw new Error(i18n.t('register:errors.versionHashFailed'));
  }
  return hex.toLowerCase();
}

export function buildRegisterCatalogItem(
  form: RegisterPackageForm,
  tags: string[],
  inherited: Partial<Pick<RegisterCatalogItem, 'popularity' | 'trend'>> = {},
): RegisterCatalogItem {
  const id = form.id.trim();
  const deprecationEnabled = form.deprecationEnabled;
  const deprecationMessage = deprecationEnabled ? form.deprecationMessage.trim() : '';
  return {
    id,
    legacyId: form.legacyId.trim() || id,
    packageType: normalizeSourcePackageType(form.type),
    packageRole: form.packageRole || 'primaryPackage',
    name: form.name.trim(),
    author: form.author.trim(),
    summary: form.summary.trim(),
    typeLabel: form.type.trim(),
    tags: normalizeArrayText(tags),
    latestVersion: computeLatestVersion(form),
    latestReleaseDate: form.versions.at(-1)?.releaseDate?.trim() ?? '',
    popularity: toFiniteNumber(inherited.popularity, 0),
    trend: toFiniteNumber(inherited.trend, 0),
    registerRelevantHash: computeRegisterRelevantHash(form),
    ...(deprecationEnabled ? { deprecation: { message: deprecationMessage } } : {}),
  };
}

export function buildSourceSubmitPayload(
  form: RegisterPackageForm,
  tags: string[],
  options: {
    locale: string;
  },
): RegisterSourceSubmitPayload {
  const id = form.id.trim();
  const locale = resolveSourceLocale(form, options.locale);
  const basePath = buildPackageSourceBasePath(id);
  const sourceFiles: RegisterSourceSubmitFile[] = [];
  const packageType = normalizeSourcePackageType(form.type);
  const niconiCommonsId = form.niconiCommonsId.trim();
  const relationRequires = commaListToArray(form.relationRequiresText);
  const relationRecommends = commaListToArray(form.relationRecommendsText);
  const relationConflicts = commaListToArray(form.relationConflictsText);
  const relationSimilar = commaListToArray(form.relationSimilarText);
  const relationReplaces = commaListToArray(form.relationReplacesText);
  const relationForkOf = form.relationForkOfText.trim();
  const relations = {
    ...(relationRequires.length ? { requires: relationRequires } : {}),
    ...(relationRecommends.length ? { recommends: relationRecommends } : {}),
    ...(relationConflicts.length ? { conflicts: relationConflicts } : {}),
    ...(relationSimilar.length ? { similar: relationSimilar } : {}),
    ...(relationReplaces.length ? { replaces: relationReplaces } : {}),
    ...(relationForkOf ? { forkOf: relationForkOf } : {}),
  };
  const imagePayload = buildSourceImagePayload(form, basePath, sourceFiles);
  const meta = sourceMetaSchema.parse({
    id,
    legacyId: form.legacyId.trim() || id,
    packageType,
    packageRole: form.packageRole || 'primaryPackage',
    addedAt: form.addedAt.trim(),
    packagePageUrl: form.packagePageUrl.trim(),
    ...(niconiCommonsId ? { niconiCommonsId } : {}),
  });
  const install = sourceInstallSchema.parse({
    ...(Object.keys(relations).length ? { relations } : {}),
    installation: buildInstallerPayload(form),
  });
  const versions = sourceVersionsSchema.parse({
    versions: form.versions.map((version) => ({
      version: version.version.trim(),
      releaseDate: version.releaseDate.trim(),
      files: version.files.map((file) => ({
        path: file.path.trim(),
        xxh128: file.xxh128.trim(),
      })),
    })),
  });

  appendSourceFile(sourceFiles, `${basePath}/meta.json`, createJsonFile(meta));
  appendSourceFile(sourceFiles, `${basePath}/install.json`, createJsonFile(install));
  appendSourceFile(sourceFiles, `${basePath}/versions.json`, createJsonFile(versions));
  const localizedContents: Record<string, RegisterLocalizedContentForm> = {
    ...form.localizedContents,
    [locale]: getCurrentLocalizedContent(form, tags),
  };
  for (const [contentLocale, localized] of Object.entries(localizedContents)) {
    const normalizedLocale = String(contentLocale || '').trim();
    if (!SUPPORTED_SOURCE_LOCALES.includes(normalizedLocale as (typeof SUPPORTED_SOURCE_LOCALES)[number])) continue;
    const content = buildLocalizedSourceContent({
      localized,
      locale: normalizedLocale,
      imagePayload,
    });
    appendSourceFile(sourceFiles, `${basePath}/content/${normalizedLocale}.json`, createJsonFile(content));
    appendLocalizedMarkdownFiles({
      sourceFiles,
      basePath,
      content,
      localized,
    });
  }

  return {
    sourceFiles,
    sourcePaths: sourceFiles.map((file) => file.path),
  };
}

export function buildInstallerTestItem(form: RegisterPackageForm): RegisterInstallerTestItem {
  const id = form.id.trim() || 'installer-test';
  return {
    id,
    installer: buildInstallerPayload(form),
    latestVersion: computeLatestVersion(form),
    versions: buildVersionPayload(form),
  };
}
