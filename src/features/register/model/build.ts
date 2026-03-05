/**
 * 入力状態を API 送信用ペイロードへ構築するモジュール
 */
import { commaListToArray, isHttpsUrl, normalizeArrayText } from './helpers';
import { buildInstallerSource, serializeInstallStep, serializeUninstallStep } from './installerRules';
import { getFileExtension } from './parse';
import type { RegisterInstallerTestItem, RegisterPackageForm } from './types';
import type { CatalogEntry, Image, Installer, License, Version } from '../../../utils/catalogSchema';
import { ipc } from '../../../utils/invokeIpc';

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

export async function computeHashFromFile(filePath: string): Promise<string> {
  if (!filePath) return '';
  const hex = await ipc.calcXxh3Hex({ path: filePath });
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
