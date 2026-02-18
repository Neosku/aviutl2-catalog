/**
 * 入力状態を API 送信用ペイロードへ構築するモジュール
 */
import { commaListToArray, isHttpsUrl, normalizeArrayText } from './helpers';
import { getFileExtension } from './parse';
import type {
  RegisterInstallStep,
  RegisterInstallerTestItem,
  RegisterPackageForm,
  RegisterUninstallStep,
} from './types';
import type {
  CatalogEntry,
  Image,
  Installer,
  InstallerAction,
  InstallerSource,
  License,
  Version,
} from '../../../utils/catalogSchema.js';

function extractInstallerSource(form: RegisterPackageForm): InstallerSource {
  if (form.installer.sourceType === 'direct') {
    const direct = form.installer.directUrl.trim();
    if (!direct) throw new Error('installer.source.direct is required');
    return { direct };
  }
  if (form.installer.sourceType === 'booth') {
    const booth = form.installer.boothUrl.trim();
    if (!booth) throw new Error('installer.source.booth is required');
    return { booth };
  }
  if (form.installer.sourceType === 'github') {
    const owner = form.installer.githubOwner.trim();
    const repo = form.installer.githubRepo.trim();
    const pattern = form.installer.githubPattern.trim();
    if (!owner || !repo || !pattern) {
      throw new Error('installer.source.github owner/repo/pattern are required');
    }
    return { github: { owner, repo, pattern } };
  }
  if (form.installer.sourceType === 'GoogleDrive') {
    const id = form.installer.googleDriveId.trim();
    if (!id) throw new Error('installer.source.GoogleDrive.id is required');
    return { GoogleDrive: { id } };
  }
  throw new Error('installer.source must be selected');
}

function parseArgsText(argsText: string): string[] {
  if (!argsText) return [];
  return argsText
    .split(',')
    .map((value) => value.trim())
    .filter(Boolean);
}

function serializeInstallStep(step: RegisterInstallStep): InstallerAction {
  const action = String(step.action || '').trim();
  const path = String(step.path || '').trim();
  const from = String(step.from || '').trim();
  const to = String(step.to || '').trim();

  if (action === 'download') return { action: 'download' };
  if (action === 'extract') {
    return { action: 'extract', ...(from ? { from } : {}), ...(to ? { to } : {}) };
  }
  if (action === 'extract_sfx') {
    return { action: 'extract_sfx', ...(from ? { from } : {}), ...(to ? { to } : {}) };
  }
  if (action === 'copy') {
    if (!from || !to) throw new Error('copy action requires from/to');
    return { action: 'copy', from, to };
  }
  if (action === 'delete') {
    if (!path) throw new Error('delete action requires path');
    return { action: 'delete', path };
  }
  if (action === 'run') {
    if (!path) throw new Error('run action requires path');
    return {
      action: 'run',
      path,
      args: parseArgsText(step.argsText),
      ...(step.elevate ? { elevate: true } : {}),
    };
  }
  if (action === 'run_auo_setup') {
    if (!path) throw new Error('run_auo_setup action requires path');
    return { action: 'run_auo_setup', path };
  }
  throw new Error(`unsupported install action: ${action || '(empty)'}`);
}

function serializeUninstallStep(step: RegisterUninstallStep): InstallerAction {
  const action = String(step.action || '').trim();
  const path = String(step.path || '').trim();
  if (action === 'delete') {
    if (!path) throw new Error('delete action requires path');
    return { action: 'delete', path };
  }
  if (action === 'run') {
    if (!path) throw new Error('run action requires path');
    return {
      action: 'run',
      path,
      args: parseArgsText(step.argsText),
      ...(step.elevate ? { elevate: true } : {}),
    };
  }
  throw new Error(`unsupported uninstall action: ${action || '(empty)'}`);
}

export function buildInstallerPayload(form: RegisterPackageForm): Installer {
  const source = extractInstallerSource(form);
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
      const resolvedType = type === 'その他' ? licenseName : type;
      const licenseBody = String(license.licenseBody || '').trim();
      const isCustom = license.isCustom || type === '不明' || type === 'その他' || licenseBody.length > 0;
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

export function computeLatestVersion(form: RegisterPackageForm): string {
  if (!form.versions.length) return '';
  const last = form.versions[form.versions.length - 1];
  return last?.version?.trim() || '';
}

function toFiniteNumber(value: unknown, fallback = 0): number {
  const num = Number(value);
  return Number.isFinite(num) ? num : fallback;
}

export async function computeHashFromFile(fileOrPath: any): Promise<string> {
  if (!fileOrPath) return '';
  const path = typeof fileOrPath === 'string' ? fileOrPath : fileOrPath.path || '';
  if (!path) {
    throw new Error('XXH3_128 を計算するにはローカルファイルのパスが必要です。');
  }
  const { invoke } = await import('@tauri-apps/api/core');
  const hex = await invoke('calc_xxh3_hex', { path });
  if (!hex || typeof hex !== 'string') {
    throw new Error('XXH3_128 を計算できませんでした。');
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
  const entry: CatalogEntry = {
    id,
    name: form.name.trim(),
    type: form.type.trim(),
    summary: form.summary.trim(),
    description: useExternalDescription ? externalDescriptionUrl : `./md/${id}.md`,
    author: form.author.trim(),
    ...(originalAuthor ? { originalAuthor } : {}),
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

export function buildInstallerTestItem(form: RegisterPackageForm): RegisterInstallerTestItem {
  const id = form.id.trim() || 'installer-test';
  return {
    id,
    installer: buildInstallerPayload(form),
    'latest-version': computeLatestVersion(form),
    versions: buildVersionPayload(form),
  };
}
