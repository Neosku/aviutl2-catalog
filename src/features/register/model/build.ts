/**
 * 入力状態を API 送信用ペイロードへ構築するモジュール
 */
import { commaListToArray, isHttpsUrl, normalizeArrayText } from './helpers';
import { buildInstallerSource, serializeInstallStep, serializeUninstallStep } from './installerRules';
import { getFileExtension } from './parse';
import type { RegisterInstallerTestItem, RegisterPackageForm } from './types';
import type { CatalogEntry, Image, Installer, License, Version } from '@/utils/catalogSchema';
import { catalogPackageTypeSchema, type CatalogPackageType } from '@/utils/catalog-schema/shared/commonSchema';
import type { CatalogLicense } from '@/utils/catalog-schema/shared/licenseSchema';
import type { Installation } from '@/utils/catalog-schema/shared/installationSchema';
import {
  sourceContentSchema,
  sourceInstallSchema,
  sourceMetaSchema,
  sourceVersionsSchema,
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
    install: form.installer.installSteps.map(serializeInstallStep),
    uninstall: form.installer.uninstallSteps.map(serializeUninstallStep),
  };
}

function buildLicensesPayload(form: RegisterPackageForm): License[] {
  return (form.licenses || [])
    .map((license): License | null => {
      const type = String(license.type || '').trim();
      const licenseName = String(license.licenseName || '').trim();
      const resolvedType = isOtherRegisterLicenseType(type)
        ? licenseName
        : isUnknownRegisterLicenseType(type)
          ? '不明'
          : type;
      const licenseBody = String(license.licenseBody || '').trim();
      const isCustom =
        license.isCustom ||
        isUnknownRegisterLicenseType(type) ||
        isOtherRegisterLicenseType(type) ||
        licenseBody.length > 0;
      const copyrights = Array.isArray(license.copyrights)
        ? license.copyrights
            .map((c) => ({
              years: String(c?.years || '').trim(),
              holder: String(c?.holder || '').trim(),
            }))
            .filter((c) => c.years && c.holder)
        : [];
      if (!resolvedType) return null;
      return {
        type: resolvedType,
        isCustom,
        copyrights,
        licenseBody: isCustom ? licenseBody : null,
      };
    })
    .filter((value): value is License => value !== null);
}

function buildImagesPayload(form: RegisterPackageForm): Image[] {
  const id = form.id.trim();
  const group: Image = {};
  if (form.images.thumbnail) {
    if (form.images.thumbnail.file) {
      const ext = getFileExtension(form.images.thumbnail.file.name) || 'png';
      group.thumbnail = `./image/${id}_thumbnail.${ext}`;
    } else if (form.images.thumbnail.existingPath) {
      group.thumbnail = form.images.thumbnail.existingPath;
    }
  }
  const infoImg: string[] = [];
  form.images.info.forEach((entry, idx) => {
    if (entry.file) {
      const ext = getFileExtension(entry.file.name) || 'png';
      infoImg.push(`./image/${id}_${idx + 1}.${ext}`);
    } else if (entry.existingPath) {
      infoImg.push(entry.existingPath);
    }
  });
  if (infoImg.length) {
    group.infoImg = infoImg;
  }
  if (!group.thumbnail && !group.infoImg) return [];
  return [group];
}

function buildVersionPayload(form: RegisterPackageForm): Version[] {
  return form.versions.map((ver) => ({
    version: ver.version.trim(),
    release_date: ver.release_date.trim(),
    file: ver.files.map((f) => ({
      path: f.path.trim(),
      XXH3_128: f.hash.trim(),
    })),
  }));
}

function buildSourceLicensesPayload(form: RegisterPackageForm): CatalogLicense[] {
  return (form.licenses || [])
    .map((license): CatalogLicense | null => {
      const rawType = String(license.type || '').trim();
      const licenseName = String(license.licenseName || '').trim();
      const licenseBody = String(license.licenseBody || '').trim();
      const copyrights = Array.isArray(license.copyrights)
        ? license.copyrights
            .map((c) => ({
              years: String(c?.years || '').trim(),
              holder: String(c?.holder || '').trim(),
            }))
            .filter((c) => c.years && c.holder)
        : [];

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

function toSourceInstallerSource(source: Installer['source']): Installation['source'] {
  if ('direct' in source) {
    return { type: 'directUrl', url: source.direct };
  }
  if ('booth' in source) {
    return { type: 'booth', url: source.booth };
  }
  if ('github' in source) {
    return {
      type: 'githubRelease',
      owner: source.github.owner,
      repo: source.github.repo,
      pattern: source.github.pattern,
    };
  }
  return { type: 'googleDrive', id: source.GoogleDrive.id };
}

function toSourceInstallStep(step: Installer['install'][number]): Installation['installSteps'][number] {
  switch (step.action) {
    case 'download':
      return { action: 'download' };
    case 'extract':
      return {
        action: 'extract',
        ...(step.from ? { from: step.from } : {}),
        ...(step.to ? { to: step.to } : {}),
      };
    case 'extract_sfx':
      return {
        action: 'extractSfx',
        ...(step.from ? { from: step.from } : {}),
        ...(step.to ? { to: step.to } : {}),
      };
    case 'copy':
      return { action: 'copy', from: step.from, to: step.to };
    case 'delete':
      return { action: 'delete', path: step.path };
    case 'run':
      return {
        action: 'run',
        path: step.path,
        ...(step.args?.length ? { args: step.args } : {}),
        ...(step.elevate ? { elevate: true } : {}),
      };
    case 'run_auo_setup':
      return { action: 'runAuoSetup', path: step.path };
  }
}

function toSourceUninstallStep(step: Installer['uninstall'][number]): Installation['uninstallSteps'][number] {
  if (step.action === 'delete') {
    return { action: 'delete', path: step.path };
  }
  if (step.action !== 'run') {
    throw new Error(`unsupported uninstall action for source payload: ${step.action}`);
  }
  return {
    action: 'run',
    path: step.path,
    ...(step.args?.length ? { args: step.args } : {}),
    ...(step.elevate ? { elevate: true } : {}),
  };
}

function buildSourceInstallationPayload(form: RegisterPackageForm): Installation {
  const installer = buildInstallerPayload(form);
  return {
    source: toSourceInstallerSource(installer.source),
    installSteps: installer.install.map(toSourceInstallStep),
    uninstallSteps: installer.uninstall.map(toSourceUninstallStep),
  };
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
  const sourceLocale = String(form.sourceLocale || '').trim();
  if (sourceLocale) return sourceLocale;
  const locale = String(fallbackLocale || '').trim();
  return locale || 'ja';
}

function buildPackageSourceBasePath(packageId: string): string {
  const parts = splitPackageId(packageId);
  if (!parts) {
    throw new Error(`invalid package id: ${packageId}`);
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
  return last?.version?.trim() || '';
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

export function buildPackageEntry(
  form: RegisterPackageForm,
  tags: string[],
  inherited: Partial<Pick<CatalogEntry, 'popularity' | 'trend'>> = {},
): CatalogEntry {
  const id = form.id.trim();
  const descriptionMode = form.descriptionMode === 'external' ? 'external' : 'inline';
  const externalDescriptionUrl = String(form.descriptionUrl || '').trim();
  const useExternalDescription = descriptionMode === 'external' && isHttpsUrl(externalDescriptionUrl);
  const niconiCommonsId = String(form.niconiCommonsId || '').trim();
  const originalAuthor = String(form.originalAuthor || '').trim();
  const deprecationEnabled = form.deprecationEnabled;
  const deprecationMessage = deprecationEnabled ? String(form.deprecationMessage || '').trim() : '';
  const entry: CatalogEntry = {
    id,
    name: form.name.trim(),
    type: form.type.trim(),
    summary: form.summary.trim(),
    description: useExternalDescription ? externalDescriptionUrl : `./md/${id}.md`,
    author: form.author.trim(),
    ...(originalAuthor ? { originalAuthor } : {}),
    ...(deprecationEnabled ? { deprecation: { message: deprecationMessage } } : {}),
    repoURL: form.repoURL.trim(),
    'latest-version': computeLatestVersion(form),
    popularity: toFiniteNumber(inherited.popularity, 0),
    trend: toFiniteNumber(inherited.trend, 0),
    licenses: buildLicensesPayload(form),
    ...(niconiCommonsId ? { niconiCommonsId } : {}),
    tags: Array.isArray(tags) ? normalizeArrayText(tags) : commaListToArray(form.tagsText),
    dependencies: commaListToArray(form.dependenciesText),
    images: buildImagesPayload(form),
    installer: buildInstallerPayload(form),
    version: buildVersionPayload(form),
  };
  return entry;
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
  const typeLabel = packageType === 'custom' ? form.type.trim() : '';
  const descriptionMode = form.descriptionMode === 'external' ? 'external' : 'inline';
  const externalDescriptionUrl = String(form.descriptionUrl || '').trim();
  const useExternalDescription = descriptionMode === 'external' && isHttpsUrl(externalDescriptionUrl);
  const descriptionMarkdownSource = useExternalDescription ? externalDescriptionUrl : `./docs/${locale}.md`;
  const niconiCommonsId = String(form.niconiCommonsId || '').trim();
  const originalAuthor = String(form.originalAuthor || '').trim();
  const deprecationMessage = form.deprecationEnabled ? String(form.deprecationMessage || '').trim() : '';
  const relationRequires = commaListToArray(form.dependenciesText);
  const { requires: _previousRequires, ...baseRelations } = form.relations ?? {};
  const relations = {
    ...baseRelations,
    ...(relationRequires.length ? { requires: relationRequires } : {}),
  };
  const changelogMarkdownSource = form.changelogPath.trim();
  const noticeMarkdownSource = form.noticePath.trim();
  const descriptionUploadPath = resolveSourceMarkdownUploadPath(basePath, descriptionMarkdownSource);
  const changelogUploadPath = resolveSourceMarkdownUploadPath(basePath, changelogMarkdownSource);
  const noticeUploadPath = resolveSourceMarkdownUploadPath(basePath, noticeMarkdownSource);

  const imagePayload = buildSourceImagePayload(form, basePath, sourceFiles);
  const meta = sourceMetaSchema.parse({
    id,
    legacyId: form.legacyId.trim() || id,
    packageType,
    packageRole: form.packageRole || 'primaryPackage',
    addedAt: form.addedAt.trim(),
    packagePageUrl: form.repoURL.trim(),
    ...(niconiCommonsId ? { niconiCommonsId } : {}),
  });
  const content = sourceContentSchema.parse({
    name: form.name.trim(),
    author: form.author.trim(),
    ...(originalAuthor ? { originalAuthor } : {}),
    tags: Array.isArray(tags) ? normalizeArrayText(tags) : commaListToArray(form.tagsText),
    ...(typeLabel ? { typeLabel } : {}),
    description: {
      summary: form.summary.trim(),
      markdownSource: descriptionMarkdownSource,
    },
    ...(changelogMarkdownSource ? { changelog: { markdownSource: changelogMarkdownSource } } : {}),
    ...(noticeMarkdownSource ? { notice: { markdownSource: noticeMarkdownSource } } : {}),
    ...(deprecationMessage ? { deprecation: { message: deprecationMessage } } : {}),
    licenses: buildSourceLicensesPayload(form),
    ...(imagePayload ? { images: imagePayload } : {}),
  });
  const install = sourceInstallSchema.parse({
    ...(Object.keys(relations).length ? { relations } : {}),
    installation: buildSourceInstallationPayload(form),
  });
  const versions = sourceVersionsSchema.parse({
    versions: form.versions.map((version) => ({
      version: version.version.trim(),
      releaseDate: version.release_date.trim(),
      files: version.files.map((file) => ({
        path: file.path.trim(),
        xxh128: file.hash.trim(),
      })),
    })),
  });

  appendSourceFile(sourceFiles, `${basePath}/meta.json`, createJsonFile(meta));
  appendSourceFile(sourceFiles, `${basePath}/content/${locale}.json`, createJsonFile(content));
  appendSourceFile(sourceFiles, `${basePath}/install.json`, createJsonFile(install));
  appendSourceFile(sourceFiles, `${basePath}/versions.json`, createJsonFile(versions));
  if (!useExternalDescription && descriptionUploadPath) {
    appendSourceFile(sourceFiles, descriptionUploadPath, createMarkdownFile(form.descriptionText || ''));
  }
  if (changelogUploadPath && form.changelogText) {
    appendSourceFile(sourceFiles, changelogUploadPath, createMarkdownFile(form.changelogText));
  }
  if (noticeUploadPath && form.noticeText) {
    appendSourceFile(sourceFiles, noticeUploadPath, createMarkdownFile(form.noticeText));
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
    'latest-version': computeLatestVersion(form),
    versions: buildVersionPayload(form),
  };
}
