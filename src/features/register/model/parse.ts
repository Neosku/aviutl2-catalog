/**
 * カタログデータをフォーム状態へ変換するパーサーモジュール
 */
import type { Installation } from '@/utils/catalog-schema/shared/installationSchema';
import type { SourcePackage } from '@/utils/catalog-schema/source/sourceSchema';
import { arrayToCommaList, buildPreviewUrl, isHttpsUrl } from './helpers';
import { LICENSE_TEMPLATE_TYPES } from './constants';
import { createEmptyCopyright, createEmptyInstaller, createEmptyLicense, createEmptyPackageForm } from './factories';
import { generateKey } from './helpers';
import type { RegisterImageEntry, RegisterImageState, RegisterLicense, RegisterPackageForm } from './types';
import {
  isOtherRegisterLicenseType,
  isUnknownRegisterLicenseType,
  normalizeRegisterLicenseType,
} from '@/utils/licenseTemplates';
import { captureLocalizedContent } from './localizedContent';

type UnknownRecord = Record<string, unknown>;

interface ParsedLicenseCopyrightInput {
  years: string;
  holder: string;
}

interface ParsedLicenseInput {
  type: string;
  name: string;
  isCustom: boolean;
  licenseBody: string;
  copyrights: ParsedLicenseCopyrightInput[];
}

function asRecord(value: unknown): UnknownRecord | null {
  return value && typeof value === 'object' ? (value as UnknownRecord) : null;
}

function asString(value: unknown): string {
  return typeof value === 'string' ? value : '';
}

function asBoolean(value: unknown): boolean {
  return value === true;
}

function asArray(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

function sourceInstallerStepToRegisterState(
  step: Installation['installSteps'][number] | Installation['uninstallSteps'][number],
): Omit<RegisterPackageForm['installer']['installSteps'][number], 'key'> {
  return {
    action: step.action,
    path: 'path' in step ? step.path : '',
    argsText: 'args' in step ? (step.args ?? []).join(', ') : '',
    from: 'from' in step ? (step.from ?? '') : '',
    to: 'to' in step ? (step.to ?? '') : '',
    elevate: 'elevate' in step ? step.elevate === true : false,
  };
}

function parseLicenseInput(value: unknown): ParsedLicenseInput | null {
  const target = asRecord(value);
  if (!target) return null;
  const copyrights = asArray(target.copyrights).map((item) => {
    const row = asRecord(item);
    return {
      years: asString(row?.years),
      holder: asString(row?.holder),
    };
  });

  return {
    type: asString(target.type),
    name: asString(target.name),
    isCustom: asBoolean(target.isCustom),
    licenseBody: asString(target.licenseBody),
    copyrights,
  };
}

export function parseSourceInstallation(installation: Installation) {
  const next = createEmptyInstaller();
  const source = installation.source;
  switch (source.type) {
    case 'booth':
      next.sourceType = 'booth';
      next.boothUrl = source.url;
      break;
    case 'directUrl':
      next.sourceType = 'directUrl';
      next.directUrl = source.url;
      break;
    case 'githubRelease':
      next.sourceType = 'githubRelease';
      next.githubOwner = source.owner;
      next.githubRepo = source.repo;
      next.githubPattern = source.pattern;
      break;
    case 'googleDrive':
      next.sourceType = 'googleDrive';
      next.googleDriveId = source.id;
      break;
  }
  next.installSteps = installation.installSteps.map((step) => ({
    key: generateKey(),
    ...sourceInstallerStepToRegisterState(step),
  }));
  next.uninstallSteps = installation.uninstallSteps.map((step) => {
    const { from: _from, to: _to, ...state } = sourceInstallerStepToRegisterState(step);
    return {
      key: generateKey(),
      ...state,
    };
  });
  return next;
}

export function parseSourceImages(rawImages: SourcePackage['content']['images'], baseUrl = ''): RegisterImageState {
  const thumbnailPath = rawImages?.thumbnail ?? '';
  const thumbnail = thumbnailPath
    ? {
        existingPath: thumbnailPath,
        sourcePath: '',
        file: null,
        previewUrl: buildPreviewUrl(thumbnailPath, baseUrl),
        key: generateKey(),
      }
    : null;
  const info: RegisterImageEntry[] = (rawImages?.detailImages ?? []).map((src) => ({
    existingPath: src,
    sourcePath: '',
    file: null,
    previewUrl: buildPreviewUrl(src, baseUrl),
    key: generateKey(),
  }));
  return { thumbnail, info };
}

export function parseLicenses(rawLicenses: unknown, legacyLicense = ''): RegisterLicense[] {
  const parsedLicenses = asArray(rawLicenses)
    .map(parseLicenseInput)
    .filter((license): license is ParsedLicenseInput => license !== null)
    .map((target) => {
      // 旧スキーマ／新スキーマの両方を吸収し、UI では一貫した編集モデルに正規化する。
      const rawType = target.type;
      const sourceName = target.name.trim();
      const normalizedType = normalizeRegisterLicenseType(rawType);
      const isUnknown = isUnknownRegisterLicenseType(normalizedType);
      const isTemplateType = LICENSE_TEMPLATE_TYPES.has(rawType);
      const type: RegisterLicense['type'] =
        normalizedType || (isTemplateType ? (rawType as RegisterLicense['type']) : 'other');
      const licenseName = sourceName || (!isUnknown && !isTemplateType ? rawType : '');
      const licenseBody = target.licenseBody;
      const isCustom =
        target.isCustom ||
        isUnknownRegisterLicenseType(type) ||
        isOtherRegisterLicenseType(type) ||
        !!licenseBody.trim();
      const copyrights = target.copyrights.length
        ? target.copyrights.map((c) => ({
            key: generateKey(),
            years: c.years,
            holder: c.holder,
          }))
        : [createEmptyCopyright()];
      return {
        key: generateKey(),
        type,
        licenseName,
        isCustom,
        licenseBody,
        copyrights,
      };
    });
  if (parsedLicenses.length > 0) {
    return parsedLicenses;
  }
  if (legacyLicense) {
    const rawType = String(legacyLicense || '');
    const normalizedType = normalizeRegisterLicenseType(rawType);
    const isUnknown = isUnknownRegisterLicenseType(normalizedType);
    const isTemplateType = LICENSE_TEMPLATE_TYPES.has(rawType);
    const type: RegisterLicense['type'] =
      normalizedType || (isTemplateType ? (rawType as RegisterLicense['type']) : 'other');
    const licenseName = !isUnknown && !isTemplateType ? rawType : '';
    return [
      {
        ...createEmptyLicense(),
        type,
        licenseName,
        isCustom: false,
      },
    ];
  }
  return [createEmptyLicense()];
}

export function sourcePackageToForm(args: {
  sourcePackage: SourcePackage;
  packageBasePath?: string;
  descriptionMarkdown?: string;
  changelogMarkdown?: string;
  noticeMarkdown?: string;
  locale?: string;
}): RegisterPackageForm {
  const { meta, content, install, versions } = args.sourcePackage;
  const form = createEmptyPackageForm();
  form.id = meta.id;
  form.legacyId = meta.legacyId;
  form.packageRole = meta.packageRole;
  form.addedAt = meta.addedAt;
  form.sourceLocale = args.locale || 'ja';
  form.name = content.name;
  form.author = content.author;
  form.originalAuthor = content.originalAuthor ?? '';
  form.deprecationEnabled = Boolean(content.deprecation);
  form.deprecationMessage = content.deprecation?.message ?? '';
  form.type = content.typeLabel || meta.packageType;
  form.summary = content.description.summary;
  form.niconiCommonsId = meta.niconiCommonsId ?? '';
  const descriptionMarkdownSource = content.description.markdownSource;
  const isExternalDescription = isHttpsUrl(descriptionMarkdownSource);
  form.descriptionPath = descriptionMarkdownSource;
  form.descriptionMode = isExternalDescription ? 'external' : 'inline';
  form.descriptionUrl = isExternalDescription ? descriptionMarkdownSource : '';
  form.descriptionText = isExternalDescription ? '' : (args.descriptionMarkdown ?? '');
  const changelogMarkdownSource = content.changelog?.markdownSource ?? '';
  const isExternalChangelog = isHttpsUrl(changelogMarkdownSource);
  form.changelogPath = changelogMarkdownSource;
  form.changelogMode = isExternalChangelog ? 'external' : 'inline';
  form.changelogUrl = isExternalChangelog ? changelogMarkdownSource : '';
  form.changelogText = isExternalChangelog ? '' : (args.changelogMarkdown ?? '');
  form.noticePath = content.notice?.markdownSource ?? '';
  form.noticeText = args.noticeMarkdown ?? '';
  form.packagePageUrl = meta.packagePageUrl;
  form.licenses = parseLicenses(content.licenses, '');
  form.tagsText = arrayToCommaList(content.tags);
  form.relationRequiresText = arrayToCommaList(install.relations?.requires ?? []);
  form.relationRecommendsText = arrayToCommaList(install.relations?.recommends ?? []);
  form.relationConflictsText = arrayToCommaList(install.relations?.conflicts ?? []);
  form.relationSimilarText = arrayToCommaList(install.relations?.similar ?? []);
  form.relationReplacesText = arrayToCommaList(install.relations?.replaces ?? []);
  form.relationForkOfText = install.relations?.forkOf ?? '';
  form.installer = parseSourceInstallation(install.installation);
  form.versions = versions.versions.map((version) => ({
    key: generateKey(),
    version: version.version,
    releaseDate: version.releaseDate,
    files: version.files.map((file) => ({
      key: generateKey(),
      path: file.path,
      xxh128: file.xxh128,
      fileName: '',
    })),
  }));
  form.images = parseSourceImages(content.images, args.packageBasePath ?? '');
  form.localizedContents = {
    [form.sourceLocale]: captureLocalizedContent(form),
  };
  return form;
}

export function getFileExtension(name = ''): string {
  const idx = name.lastIndexOf('.');
  if (idx <= 0 || idx === name.length - 1) return '';
  return name.slice(idx + 1).toLowerCase();
}
