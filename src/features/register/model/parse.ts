/**
 * カタログデータをフォーム状態へ変換するパーサーモジュール
 */
import { arrayToCommaList, buildPreviewUrl, isHttpsUrl, isMarkdownPath } from './helpers';
import { INSTALL_ACTIONS, LICENSE_TEMPLATE_TYPES, SPECIAL_INSTALL_ACTIONS, UNINSTALL_ACTIONS } from './constants';
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

export function parseInstallerSource(installer: any = {}) {
  if (!installer || typeof installer !== 'object') return createEmptyInstaller();
  const next = createEmptyInstaller();
  const source = installer.source || {};
  if (source.booth) {
    next.sourceType = 'booth';
    next.boothUrl = String(source.booth || '');
  } else if (source.direct) {
    next.sourceType = 'direct';
    next.directUrl = String(source.direct || '');
  } else if (source.github) {
    next.sourceType = 'github';
    next.githubOwner = String(source.github?.owner || '');
    next.githubRepo = String(source.github?.repo || '');
    next.githubPattern = String(source.github?.pattern || '');
  } else if (source.GoogleDrive) {
    next.sourceType = 'GoogleDrive';
    next.googleDriveId = String(source.GoogleDrive?.id || '');
  }
  // 不正値が来ても UI が壊れないよう、未知 action は安全側の既定値へ寄せる。
  const installSteps = Array.isArray(installer.install) ? installer.install : [];
  next.installSteps = installSteps.map((step: any) => {
    const action = step?.action;
    const normalizedAction =
      INSTALL_ACTIONS.includes(action) || SPECIAL_INSTALL_ACTIONS.includes(action) ? action : 'download';
    return {
      key: generateKey(),
      action: normalizedAction,
      path: String(step?.path || ''),
      argsText: Array.isArray(step?.args)
        ? step.args
            .map((arg: unknown) => String(arg || ''))
            .filter(Boolean)
            .join(', ')
        : '',
      from: String(step?.from || ''),
      to: String(step?.to || ''),
      elevate: !!step?.elevate,
    };
  });
  const uninstallSteps = Array.isArray(installer.uninstall) ? installer.uninstall : [];
  next.uninstallSteps = uninstallSteps.map((step: any) => ({
    key: generateKey(),
    action: UNINSTALL_ACTIONS.includes(step?.action) ? step.action : 'delete',
    path: String(step?.path || ''),
    argsText: Array.isArray(step?.args)
      ? step.args
          .map((arg: unknown) => String(arg || ''))
          .filter(Boolean)
          .join(', ')
      : '',
    elevate: !!step?.elevate,
  }));
  return next;
}

export function parseVersions(rawVersions: any): RegisterVersion[] {
  const arr = Array.isArray(rawVersions) ? rawVersions : [];
  if (!arr.length) return [];
  return arr.map((ver) => {
    const files = Array.isArray(ver?.file) ? ver.file : [];
    return {
      key: generateKey(),
      version: String(ver?.version || ''),
      release_date: String(ver?.release_date || ''),
      files: files.length
        ? files.map((f: any) => ({
            key: generateKey(),
            path: String(f?.path || ''),
            hash: String(f?.XXH3_128 || f?.xxh3_128 || ''),
            fileName: '',
          }))
        : [createEmptyVersionFile()],
    };
  });
}

export function parseImages(rawImages: any, baseUrl = ''): RegisterImageState {
  if (!Array.isArray(rawImages) || !rawImages.length) {
    return { thumbnail: null, info: [] };
  }
  const first = rawImages[0] || {};
  const thumbnailPath = typeof first.thumbnail === 'string' ? first.thumbnail : '';
  const thumbnail = thumbnailPath
    ? {
        existingPath: thumbnailPath,
        sourcePath: '',
        file: null,
        previewUrl: buildPreviewUrl(thumbnailPath, baseUrl),
        key: generateKey(),
      }
    : null;
  const infoImg = Array.isArray(first.infoImg) ? first.infoImg : [];
  const info: RegisterImageEntry[] = infoImg.map((src: unknown) => ({
    existingPath: String(src || ''),
    sourcePath: '',
    file: null,
    previewUrl: buildPreviewUrl(String(src || ''), baseUrl),
    key: generateKey(),
  }));
  return { thumbnail, info };
}

export function parseLicenses(rawLicenses: any, legacyLicense = ''): RegisterLicense[] {
  const list = Array.isArray(rawLicenses) ? rawLicenses : [];
  const target = list[0];
  if (target) {
    // 旧スキーマ／新スキーマの両方を吸収し、UI では一貫した編集モデルに正規化する。
    const rawType = String(target?.type || '');
    const isUnknown = rawType === '不明';
    const isTemplateType = LICENSE_TEMPLATE_TYPES.has(rawType);
    const type = isUnknown || isTemplateType ? rawType : 'その他';
    const licenseName = !isUnknown && !isTemplateType ? rawType : '';
    const licenseBody = typeof target?.licenseBody === 'string' ? target.licenseBody : '';
    const isCustom = !!target?.isCustom || type === '不明' || type === 'その他' || !!licenseBody.trim();
    const copyrights =
      Array.isArray(target?.copyrights) && target.copyrights.length
        ? target.copyrights.slice(0, 1).map((c: any) => ({
            key: generateKey(),
            years: String(c?.years || ''),
            holder: String(c?.holder || ''),
          }))
        : [createEmptyCopyright()];
    return [
      {
        key: generateKey(),
        type,
        licenseName,
        isCustom,
        licenseBody,
        copyrights,
      },
    ];
  }
  if (legacyLicense) {
    const rawType = String(legacyLicense || '');
    const isUnknown = rawType === '不明';
    const isTemplateType = LICENSE_TEMPLATE_TYPES.has(rawType);
    const type = isUnknown || isTemplateType ? rawType : 'その他';
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

export function entryToForm(item: any, baseUrl = ''): RegisterPackageForm {
  if (!item || typeof item !== 'object') return createEmptyPackageForm();
  const form = createEmptyPackageForm();
  const rawDescription = typeof item.description === 'string' ? item.description : '';
  const descriptionValue = String(rawDescription || '');
  const isExternalDescription = isHttpsUrl(descriptionValue);
  form.id = String(item.id || '');
  form.name = String(item.name || '');
  form.author = String(item.author || '');
  form.originalAuthor = String(item.originalAuthor || '');
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
  form.licenses = parseLicenses(item.licenses, item.license);
  form.tagsText = arrayToCommaList(item.tags);
  form.dependenciesText = arrayToCommaList(item.dependencies);
  form.installer = parseInstallerSource(item.installer);
  form.versions = parseVersions(item.version || item.versions);
  form.images = parseImages(item.images, baseUrl);
  return form;
}

export function getFileExtension(name = ''): string {
  const idx = name.lastIndexOf('.');
  if (idx <= 0 || idx === name.length - 1) return '';
  return name.slice(idx + 1).toLowerCase();
}
