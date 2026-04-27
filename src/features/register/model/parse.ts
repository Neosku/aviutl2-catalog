/**
 * カタログデータをフォーム状態へ変換するパーサーモジュール
 */
import type { CatalogEntry } from '@/utils/catalogSchema';
import type { Installation } from '@/utils/catalog-schema/shared/installationSchema';
import type { SourcePackage } from '@/utils/catalog-schema/source/sourceSchema';
import { arrayToCommaList, buildPreviewUrl, isHttpsUrl, isMarkdownPath } from './helpers';
import { LICENSE_TEMPLATE_TYPES } from './constants';
import {
  createEmptyCopyright,
  createEmptyInstaller,
  createEmptyLicense,
  createEmptyPackageForm,
  createEmptyVersionFile,
} from './factories';
import { generateKey } from './helpers';
import type {
  RegisterImageEntry,
  RegisterImageState,
  RegisterLicense,
  RegisterPackageForm,
  RegisterVersion,
} from './types';
import {
  isOtherRegisterLicenseType,
  isUnknownRegisterLicenseType,
  normalizeRegisterLicenseType,
} from '@/utils/licenseTemplates';

type UnknownRecord = Record<string, unknown>;

interface ParsedInstallerStepInput {
  action: string;
  path: string;
  args: string[];
  from: string;
  to: string;
  elevate: boolean;
}

interface ParsedInstallerSourceInput {
  booth: string;
  direct: string;
  githubOwner: string;
  githubRepo: string;
  githubPattern: string;
  googleDriveId: string;
}

interface ParsedInstallerInput {
  source: ParsedInstallerSourceInput;
  install: ParsedInstallerStepInput[];
  uninstall: ParsedInstallerStepInput[];
}

interface ParsedVersionFileInput {
  path: string;
  hash: string;
}

interface ParsedVersionInput {
  version: string;
  releaseDate: string;
  files: ParsedVersionFileInput[];
}

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

function toStringArray(value: unknown): string[] {
  return asArray(value)
    .map((item) => String(item || ''))
    .filter(Boolean);
}

function parseInstallerStepInput(value: unknown): ParsedInstallerStepInput {
  const row = asRecord(value);
  return {
    action: asString(row?.action),
    path: asString(row?.path),
    args: toStringArray(row?.args),
    from: asString(row?.from),
    to: asString(row?.to),
    elevate: asBoolean(row?.elevate),
  };
}

function parseInstallerInput(raw: unknown): ParsedInstallerInput {
  const installer = asRecord(raw);
  const sourceRaw = asRecord(installer?.source);
  const github = asRecord(sourceRaw?.github);
  const googleDrive = asRecord(sourceRaw?.GoogleDrive);

  return {
    source: {
      booth: asString(sourceRaw?.booth),
      direct: asString(sourceRaw?.direct),
      githubOwner: asString(github?.owner),
      githubRepo: asString(github?.repo),
      githubPattern: asString(github?.pattern),
      googleDriveId: asString(googleDrive?.id),
    },
    install: asArray(installer?.install).map(parseInstallerStepInput),
    uninstall: asArray(installer?.uninstall).map(parseInstallerStepInput),
  };
}

function parseSourceInstallerStepInput(
  step: Installation['installSteps'][number] | Installation['uninstallSteps'][number],
): ParsedInstallerStepInput {
  return {
    action:
      step.action === 'extractSfx' ? 'extract_sfx' : step.action === 'runAuoSetup' ? 'run_auo_setup' : step.action,
    path: 'path' in step ? step.path : '',
    args: 'args' in step ? (step.args ?? []) : [],
    from: 'from' in step ? (step.from ?? '') : '',
    to: 'to' in step ? (step.to ?? '') : '',
    elevate: 'elevate' in step ? step.elevate === true : false,
  };
}

function parseSourceInstallerInput(installation: Installation): ParsedInstallerInput {
  const source = installation.source;
  const parsedSource: ParsedInstallerSourceInput = {
    booth: '',
    direct: '',
    githubOwner: '',
    githubRepo: '',
    githubPattern: '',
    googleDriveId: '',
  };

  switch (source.type) {
    case 'directUrl':
      parsedSource.direct = source.url;
      break;
    case 'booth':
      parsedSource.booth = source.url;
      break;
    case 'githubRelease':
      parsedSource.githubOwner = source.owner;
      parsedSource.githubRepo = source.repo;
      parsedSource.githubPattern = source.pattern;
      break;
    case 'googleDrive':
      parsedSource.googleDriveId = source.id;
      break;
  }

  return {
    source: parsedSource,
    install: installation.installSteps.map(parseSourceInstallerStepInput),
    uninstall: installation.uninstallSteps.map(parseSourceInstallerStepInput),
  };
}

function parseVersionInput(value: unknown): ParsedVersionInput {
  const version = asRecord(value);
  const files = asArray(version?.file).map((item) => {
    const file = asRecord(item);
    return {
      path: asString(file?.path),
      hash: asString(file?.XXH3_128) || asString(file?.xxh3_128),
    };
  });

  return {
    version: asString(version?.version),
    releaseDate: asString(version?.release_date),
    files,
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

function parseImagesInput(raw: unknown): { thumbnail: string; info: string[] } {
  const first = asRecord(asArray(raw)[0]);
  return {
    thumbnail: asString(first?.thumbnail),
    info: toStringArray(first?.infoImg),
  };
}

export function parseInstallerSource(installer: unknown = {}) {
  return installerInputToRegisterState(parseInstallerInput(installer));
}

function installerInputToRegisterState(parsed: ParsedInstallerInput) {
  const next = createEmptyInstaller();
  if (parsed.source.booth) {
    next.sourceType = 'booth';
    next.boothUrl = parsed.source.booth;
  } else if (parsed.source.direct) {
    next.sourceType = 'direct';
    next.directUrl = parsed.source.direct;
  } else if (parsed.source.githubOwner || parsed.source.githubRepo || parsed.source.githubPattern) {
    next.sourceType = 'github';
    next.githubOwner = parsed.source.githubOwner;
    next.githubRepo = parsed.source.githubRepo;
    next.githubPattern = parsed.source.githubPattern;
  } else if (parsed.source.googleDriveId) {
    next.sourceType = 'GoogleDrive';
    next.googleDriveId = parsed.source.googleDriveId;
  }
  next.installSteps = parsed.install.map((step) => {
    return {
      key: generateKey(),
      action: step.action,
      path: step.path,
      argsText: step.args.join(', '),
      from: step.from,
      to: step.to,
      elevate: step.elevate,
    };
  });
  next.uninstallSteps = parsed.uninstall.map((step) => ({
    key: generateKey(),
    action: step.action,
    path: step.path,
    argsText: step.args.join(', '),
    elevate: step.elevate,
  }));
  return next;
}

export function parseSourceInstallation(installation: Installation) {
  return installerInputToRegisterState(parseSourceInstallerInput(installation));
}

export function parseVersions(rawVersions: unknown): RegisterVersion[] {
  const arr = asArray(rawVersions).map(parseVersionInput);
  if (!arr.length) return [];
  return arr.map((ver) => {
    const files = ver.files;
    return {
      key: generateKey(),
      version: ver.version,
      release_date: ver.releaseDate,
      files: files.length
        ? files.map((f) => ({
            key: generateKey(),
            path: f.path,
            hash: f.hash,
            fileName: '',
          }))
        : [createEmptyVersionFile()],
    };
  });
}

export function parseImages(rawImages: unknown, baseUrl = ''): RegisterImageState {
  const parsed = parseImagesInput(rawImages);
  if (!parsed.thumbnail && !parsed.info.length) {
    return { thumbnail: null, info: [] };
  }
  const thumbnailPath = parsed.thumbnail;
  const thumbnail = thumbnailPath
    ? {
        existingPath: thumbnailPath,
        sourcePath: '',
        file: null,
        previewUrl: buildPreviewUrl(thumbnailPath, baseUrl),
        key: generateKey(),
      }
    : null;
  const info: RegisterImageEntry[] = parsed.info.map((src) => ({
    existingPath: src,
    sourcePath: '',
    file: null,
    previewUrl: buildPreviewUrl(src, baseUrl),
    key: generateKey(),
  }));
  return { thumbnail, info };
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

export function entryToForm(item: CatalogEntry | null | undefined, baseUrl = ''): RegisterPackageForm {
  if (!item || typeof item !== 'object') return createEmptyPackageForm();
  const form = createEmptyPackageForm();
  const rawDescription = typeof item.description === 'string' ? item.description : '';
  const descriptionValue = String(rawDescription || '');
  const isExternalDescription = isHttpsUrl(descriptionValue);
  form.id = String(item.id || '');
  form.name = String(item.name || '');
  form.author = String(item.author || '');
  form.originalAuthor = String(item.originalAuthor || '');
  form.deprecationEnabled = Boolean(item.deprecation);
  form.deprecationMessage = String(item.deprecation?.message || '');
  form.type = String(item.type || '');
  form.summary = String(item.summary || '');
  form.niconiCommonsId = String(item.niconiCommonsId || '');
  form.descriptionPath = descriptionValue;
  form.descriptionMode = isExternalDescription ? 'external' : 'inline';
  form.descriptionUrl = isExternalDescription ? descriptionValue : '';
  // markdown パス形式なら本文は外部取得に任せ、直書き文字列のみ初期本文として保持する。
  form.descriptionText =
    !isExternalDescription && descriptionValue && !isMarkdownPath(descriptionValue) ? descriptionValue : '';
  form.repoURL = String(item.repoURL || '');
  form.licenses = parseLicenses(item.licenses, '');
  form.tagsText = arrayToCommaList(item.tags);
  form.dependenciesText = arrayToCommaList(item.dependencies);
  form.installer = parseInstallerSource(item.installer);
  form.versions = parseVersions(item.version);
  form.images = parseImages(item.images, baseUrl);
  return form;
}

export function sourcePackageToForm(args: {
  sourcePackage: SourcePackage;
  packageBasePath?: string;
  descriptionMarkdown?: string;
}): RegisterPackageForm {
  const { meta, content, install, versions } = args.sourcePackage;
  const form = createEmptyPackageForm();
  form.id = meta.id;
  form.name = content.name;
  form.author = content.author;
  form.originalAuthor = content.originalAuthor ?? '';
  form.deprecationEnabled = Boolean(content.deprecation);
  form.deprecationMessage = content.deprecation?.message ?? '';
  form.type = content.typeLabel || meta.packageType;
  form.summary = content.description.summary;
  form.niconiCommonsId = meta.niconiCommonsId ?? '';
  form.descriptionPath = content.description.markdownSource;
  form.descriptionMode = 'inline';
  form.descriptionUrl = '';
  form.descriptionText = args.descriptionMarkdown ?? '';
  form.repoURL = meta.packagePageUrl;
  form.licenses = parseLicenses(content.licenses, '');
  form.tagsText = arrayToCommaList(content.tags);
  form.dependenciesText = arrayToCommaList(install.relations?.requires ?? []);
  form.installer = parseSourceInstallation(install.installation);
  form.versions = versions.versions.map((version) => ({
    key: generateKey(),
    version: version.version,
    release_date: version.releaseDate,
    files: version.files.map((file) => ({
      key: generateKey(),
      path: file.path,
      hash: file.xxh128,
      fileName: '',
    })),
  }));
  form.images = parseSourceImages(content.images, args.packageBasePath ?? '');
  return form;
}

export function getFileExtension(name = ''): string {
  const idx = name.lastIndexOf('.');
  if (idx <= 0 || idx === name.length - 1) return '';
  return name.slice(idx + 1).toLowerCase();
}
