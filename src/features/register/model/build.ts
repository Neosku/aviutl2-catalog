/**
 * 入力状態を API 送信用ペイロードへ構築するモジュール
 */
import { commaListToArray, isHttpsUrl, normalizeArrayText } from './helpers';
import { getFileExtension } from './parse';
import type {
  RegisterCatalogEntry,
  RegisterImagePayload,
  RegisterInstallStep,
  RegisterInstallStepPayload,
  RegisterInstallerPayload,
  RegisterInstallerSourcePayload,
  RegisterInstallerTestItem,
  RegisterLicensePayload,
  RegisterPackageForm,
  RegisterUninstallStep,
  RegisterUninstallStepPayload,
  RegisterVersionPayload,
} from './types';

function extractInstallerSource(form: RegisterPackageForm): RegisterInstallerSourcePayload {
  const source: RegisterInstallerSourcePayload = {};
  if (form.installer.sourceType === 'direct' && form.installer.directUrl.trim()) {
    source.direct = form.installer.directUrl.trim();
  } else if (form.installer.sourceType === 'booth' && form.installer.boothUrl.trim()) {
    source.booth = form.installer.boothUrl.trim();
  } else if (form.installer.sourceType === 'github') {
    const owner = form.installer.githubOwner.trim();
    const repo = form.installer.githubRepo.trim();
    const pattern = form.installer.githubPattern.trim();
    if (owner && repo && pattern) {
      source.github = { owner, repo, pattern };
    }
  } else if (form.installer.sourceType === 'GoogleDrive' && form.installer.googleDriveId.trim()) {
    source.GoogleDrive = { id: form.installer.googleDriveId.trim() };
  }
  return source;
}

function serializeInstallStep(step: RegisterInstallStep): RegisterInstallStepPayload {
  const payload: RegisterInstallStepPayload = { action: step.action };
  if (step.path && step.path.trim()) {
    payload.path = step.path.trim();
  }
  if (step.action === 'run') {
    if (step.argsText) {
      payload.args = step.argsText
        .split(',')
        .map((v) => v.trim())
        .filter(Boolean);
    }
    if (step.elevate) payload.elevate = true;
  }
  if (step.from && step.from.trim()) {
    payload.from = step.from.trim();
  }
  if (step.to && step.to.trim()) {
    payload.to = step.to.trim();
  }
  return payload;
}

function serializeUninstallStep(step: RegisterUninstallStep): RegisterUninstallStepPayload {
  const payload: RegisterUninstallStepPayload = { action: step.action };
  if (step.action === 'run') {
    if (step.path) payload.path = step.path;
    if (step.argsText) {
      payload.args = step.argsText
        .split(',')
        .map((v) => v.trim())
        .filter(Boolean);
    }
    if (step.elevate) payload.elevate = true;
  } else if (step.action === 'delete' && step.path) {
    payload.path = step.path;
  }
  return payload;
}

export function buildInstallerPayload(form: RegisterPackageForm): RegisterInstallerPayload {
  const source = extractInstallerSource(form);
  return {
    source,
    install: form.installer.installSteps.map(serializeInstallStep),
    uninstall: form.installer.uninstallSteps.map(serializeUninstallStep),
  };
}

function buildLicensesPayload(form: RegisterPackageForm): RegisterLicensePayload[] {
  return (form.licenses || [])
    .map((license): RegisterLicensePayload | null => {
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
    .filter((value): value is RegisterLicensePayload => value !== null);
}

function buildImagesPayload(form: RegisterPackageForm): RegisterImagePayload[] {
  const id = form.id.trim();
  const group: RegisterImagePayload = {};
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

function buildVersionPayload(form: RegisterPackageForm): RegisterVersionPayload[] {
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
  inherited: Record<string, unknown> = {},
): RegisterCatalogEntry {
  const id = form.id.trim();
  const descriptionMode = form.descriptionMode === 'external' ? 'external' : 'inline';
  const externalDescriptionUrl = String(form.descriptionUrl || '').trim();
  const useExternalDescription = descriptionMode === 'external' && isHttpsUrl(externalDescriptionUrl);
  const niconiCommonsId = String(form.niconiCommonsId || '').trim();
  const entry: RegisterCatalogEntry = {
    id,
    name: form.name.trim(),
    type: form.type.trim(),
    summary: form.summary.trim(),
    description: useExternalDescription ? externalDescriptionUrl : `./md/${id}.md`,
    author: form.author.trim(),
    originalAuthor: form.originalAuthor.trim(),
    repoURL: form.repoURL.trim(),
    'latest-version': computeLatestVersion(form),
    ...(Object.prototype.hasOwnProperty.call(inherited, 'popularity') ? { popularity: inherited.popularity } : {}),
    ...(Object.prototype.hasOwnProperty.call(inherited, 'trend') ? { trend: inherited.trend } : {}),
    licenses: buildLicensesPayload(form),
    niconiCommonsId,
    tags: Array.isArray(tags) ? normalizeArrayText(tags) : commaListToArray(form.tagsText),
    dependencies: commaListToArray(form.dependenciesText),
    images: buildImagesPayload(form),
    installer: buildInstallerPayload(form),
    version: buildVersionPayload(form),
  };
  if (!entry.originalAuthor) delete entry.originalAuthor;
  if (!entry.niconiCommonsId) delete entry.niconiCommonsId;
  if (!entry.repoURL) entry.repoURL = '';
  if (!entry.licenses.length) entry.licenses = [];
  if (!entry.tags.length) entry.tags = [];
  if (!entry.dependencies.length) entry.dependencies = [];
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
