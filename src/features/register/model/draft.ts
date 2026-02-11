/**
 * Draft persistence utilities for register form
 */
import { basename, generateKey, normalizeArrayText } from './helpers';
import { getFileExtension } from './parse';
import type { RegisterImageEntry, RegisterPackageForm } from './types';

const DRAFT_STORAGE_PREFIX = 'register-draft:v1:';

interface RegisterDraftImageSnapshot {
  key: string;
  existingPath: string;
  sourcePath: string;
  previewPath: string;
}

interface RegisterDraftImageStateSnapshot {
  thumbnail: RegisterDraftImageSnapshot | null;
  info: RegisterDraftImageSnapshot[];
}

type RegisterDraftFormSnapshot = Omit<RegisterPackageForm, 'images'> & {
  images: RegisterDraftImageStateSnapshot;
};

export interface RegisterDraftRecord {
  packageId: string;
  packageName: string;
  packageSender: string;
  tags: string[];
  savedAt: number;
  contentHash: string;
  installerTestedHash: string;
  uninstallerTestedHash: string;
  lastSubmittedHash: string;
  lastSubmitAt: number;
  lastSubmitError: string;
  form: RegisterDraftFormSnapshot;
}

export interface RegisterDraftListItem {
  packageId: string;
  packageName: string;
  savedAt: number;
  pending: boolean;
  readyForSubmit: boolean;
  lastSubmitError: string;
}

export interface RegisterDraftRestoreResult {
  packageForm: RegisterPackageForm;
  packageSender: string;
  tags: string[];
  warnings: string[];
}

export type RegisterDraftTestKind = 'installer' | 'uninstaller';

export interface RegisterDraftTestStatus {
  installerReady: boolean;
  uninstallerReady: boolean;
}

function getStorage(): Storage | null {
  if (typeof window === 'undefined') return null;
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

function createDraftStorageKey(packageId: string): string {
  return `${DRAFT_STORAGE_PREFIX}${encodeURIComponent(packageId)}`;
}

function computeTextHash(text: string): string {
  // Simple deterministic hash for local dirty-state tracking.
  let hash = 2166136261;
  for (let i = 0; i < text.length; i += 1) {
    hash ^= text.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return `h${(hash >>> 0).toString(16)}`;
}

function isStoredBlobUrl(url: string): boolean {
  return typeof url === 'string' && url.startsWith('blob:');
}

function toDraftImageSnapshot(entry: RegisterImageEntry): RegisterDraftImageSnapshot {
  const previewPath =
    typeof entry.previewUrl === 'string' && entry.previewUrl && !isStoredBlobUrl(entry.previewUrl)
      ? entry.previewUrl
      : '';
  return {
    key: String(entry.key || generateKey()),
    existingPath: String(entry.existingPath || ''),
    sourcePath: String(entry.sourcePath || ''),
    previewPath,
  };
}

function toDraftFormSnapshot(form: RegisterPackageForm): RegisterDraftFormSnapshot {
  const { images: _images, ...rest } = form;
  return {
    ...(rest as Omit<RegisterPackageForm, 'images'>),
    images: {
      thumbnail: form.images.thumbnail ? toDraftImageSnapshot(form.images.thumbnail) : null,
      info: Array.isArray(form.images.info) ? form.images.info.map(toDraftImageSnapshot) : [],
    },
  };
}

export function computeRegisterDraftContentHash(args: {
  packageForm: RegisterPackageForm;
  tags: string[];
  packageSender: string;
}): string {
  const form = args.packageForm;
  const normalized = {
    id: String(form.id || '').trim(),
    name: String(form.name || '').trim(),
    author: String(form.author || '').trim(),
    originalAuthor: String(form.originalAuthor || '').trim(),
    type: String(form.type || '').trim(),
    summary: String(form.summary || '').trim(),
    niconiCommonsId: String(form.niconiCommonsId || '').trim(),
    descriptionText: String(form.descriptionText || ''),
    descriptionPath: String(form.descriptionPath || '').trim(),
    descriptionMode: form.descriptionMode,
    descriptionUrl: String(form.descriptionUrl || '').trim(),
    repoURL: String(form.repoURL || '').trim(),
    licenses: (Array.isArray(form.licenses) ? form.licenses : []).map((license) => ({
      type: String(license.type || ''),
      licenseName: String(license.licenseName || ''),
      isCustom: !!license.isCustom,
      licenseBody: String(license.licenseBody || ''),
      copyrights: (Array.isArray(license.copyrights) ? license.copyrights : []).map((c) => ({
        years: String(c.years || ''),
        holder: String(c.holder || ''),
      })),
    })),
    tags: normalizeArrayText(args.tags),
    dependenciesText: String(form.dependenciesText || ''),
    installer: {
      sourceType: form.installer.sourceType,
      directUrl: String(form.installer.directUrl || ''),
      boothUrl: String(form.installer.boothUrl || ''),
      githubOwner: String(form.installer.githubOwner || ''),
      githubRepo: String(form.installer.githubRepo || ''),
      githubPattern: String(form.installer.githubPattern || ''),
      googleDriveId: String(form.installer.googleDriveId || ''),
      installSteps: (Array.isArray(form.installer.installSteps) ? form.installer.installSteps : []).map((step) => ({
        action: String(step.action || ''),
        path: String(step.path || ''),
        argsText: String(step.argsText || ''),
        from: String(step.from || ''),
        to: String(step.to || ''),
        elevate: !!step.elevate,
      })),
      uninstallSteps: (Array.isArray(form.installer.uninstallSteps) ? form.installer.uninstallSteps : []).map(
        (step) => ({
          action: String(step.action || ''),
          path: String(step.path || ''),
          argsText: String(step.argsText || ''),
          elevate: !!step.elevate,
        }),
      ),
    },
    versions: (Array.isArray(form.versions) ? form.versions : []).map((ver) => ({
      version: String(ver.version || ''),
      release_date: String(ver.release_date || ''),
      files: (Array.isArray(ver.files) ? ver.files : []).map((file) => ({
        path: String(file.path || ''),
        hash: String(file.hash || ''),
        fileName: String(file.fileName || ''),
      })),
    })),
    images: {
      thumbnail: form.images.thumbnail
        ? {
            existingPath: String(form.images.thumbnail.existingPath || ''),
            sourcePath: String(form.images.thumbnail.sourcePath || ''),
            fileName: String(form.images.thumbnail.file?.name || ''),
          }
        : null,
      info: (Array.isArray(form.images.info) ? form.images.info : []).map((entry) => ({
        existingPath: String(entry.existingPath || ''),
        sourcePath: String(entry.sourcePath || ''),
        fileName: String(entry.file?.name || ''),
      })),
    },
    packageSender: String(args.packageSender || '').trim(),
  };
  return computeTextHash(JSON.stringify(normalized));
}

export function isRegisterDraftPending(record: RegisterDraftRecord): boolean {
  return String(record.contentHash || '') !== String(record.lastSubmittedHash || '');
}

export function getRegisterDraftTestStatus(record: RegisterDraftRecord): RegisterDraftTestStatus {
  const contentHash = String(record.contentHash || '');
  const installerTestedHash = String(record.installerTestedHash || '');
  const uninstallerTestedHash = String(record.uninstallerTestedHash || '');
  if (!contentHash) {
    return {
      installerReady: false,
      uninstallerReady: false,
    };
  }
  return {
    installerReady: installerTestedHash === contentHash,
    uninstallerReady: uninstallerTestedHash === contentHash,
  };
}

export function isRegisterDraftReadyForSubmit(record: RegisterDraftRecord): boolean {
  const status = getRegisterDraftTestStatus(record);
  return status.installerReady && status.uninstallerReady;
}

function parseDraftRecord(raw: unknown): RegisterDraftRecord | null {
  if (!raw || typeof raw !== 'object') return null;
  const candidate = raw as Partial<RegisterDraftRecord>;
  if (typeof candidate.packageId !== 'string' || !candidate.packageId.trim()) return null;
  if (!candidate.form || typeof candidate.form !== 'object') return null;
  const fallbackContentHash = computeTextHash(
    JSON.stringify({
      form: candidate.form,
      tags: Array.isArray(candidate.tags) ? candidate.tags : [],
      packageSender: candidate.packageSender || '',
    }),
  );
  return {
    packageId: candidate.packageId.trim(),
    packageName: String(candidate.packageName || candidate.packageId || ''),
    packageSender: String(candidate.packageSender || ''),
    tags: normalizeArrayText(Array.isArray(candidate.tags) ? candidate.tags : []),
    savedAt: Number.isFinite(candidate.savedAt) ? Number(candidate.savedAt) : Date.now(),
    contentHash: String(candidate.contentHash || fallbackContentHash),
    installerTestedHash: String(candidate.installerTestedHash || ''),
    uninstallerTestedHash: String(candidate.uninstallerTestedHash || ''),
    lastSubmittedHash: String(candidate.lastSubmittedHash || ''),
    lastSubmitAt: Number.isFinite(candidate.lastSubmitAt) ? Number(candidate.lastSubmitAt) : 0,
    lastSubmitError: String(candidate.lastSubmitError || ''),
    form: candidate.form as RegisterDraftFormSnapshot,
  };
}

function inferMimeType(path: string): string {
  const ext = getFileExtension(path);
  if (!ext) return 'application/octet-stream';
  if (ext === 'jpg' || ext === 'jpeg') return 'image/jpeg';
  if (ext === 'png') return 'image/png';
  if (ext === 'gif') return 'image/gif';
  if (ext === 'webp') return 'image/webp';
  if (ext === 'svg') return 'image/svg+xml';
  if (ext === 'bmp') return 'image/bmp';
  return 'application/octet-stream';
}

async function readFileFromPath(path: string): Promise<File> {
  const { readFile } = await import('@tauri-apps/plugin-fs');
  const bytes = await readFile(path);
  const filename = basename(path) || 'image';
  return new File([bytes], filename, { type: inferMimeType(path) });
}

async function restoreImageEntry(
  snapshot: RegisterDraftImageSnapshot,
  warnings: string[],
  label: string,
): Promise<RegisterImageEntry> {
  const key = String(snapshot.key || generateKey());
  const existingPath = String(snapshot.existingPath || '');
  const sourcePath = String(snapshot.sourcePath || '');
  const previewPath = String(snapshot.previewPath || '');
  if (!sourcePath) {
    return {
      key,
      existingPath,
      sourcePath: '',
      file: null,
      previewUrl: previewPath || existingPath || '',
    };
  }
  try {
    const file = await readFileFromPath(sourcePath);
    return {
      key,
      existingPath,
      sourcePath,
      file,
      previewUrl: URL.createObjectURL(file),
    };
  } catch {
    warnings.push(`${label} の元ファイルを再読み込みできませんでした: ${sourcePath}`);
    return {
      key,
      existingPath,
      sourcePath,
      file: null,
      previewUrl: previewPath || existingPath || '',
    };
  }
}

export function saveRegisterDraft(args: {
  packageForm: RegisterPackageForm;
  tags: string[];
  packageSender: string;
}): RegisterDraftRecord {
  const storage = getStorage();
  if (!storage) {
    throw new Error('一時保存を利用できません。');
  }
  const packageId = String(args.packageForm.id || '').trim();
  if (!packageId) {
    throw new Error('一時保存には ID の入力が必要です。');
  }
  const previous = getRegisterDraft(packageId);
  const contentHash = computeRegisterDraftContentHash(args);
  const record: RegisterDraftRecord = {
    packageId,
    packageName: String(args.packageForm.name || packageId || '').trim(),
    packageSender: String(args.packageSender || ''),
    tags: normalizeArrayText(args.tags),
    savedAt: Date.now(),
    contentHash,
    installerTestedHash: String(previous?.installerTestedHash || ''),
    uninstallerTestedHash: String(previous?.uninstallerTestedHash || ''),
    lastSubmittedHash: String(previous?.lastSubmittedHash || ''),
    lastSubmitAt: Number(previous?.lastSubmitAt || 0),
    lastSubmitError: String(previous?.lastSubmitError || ''),
    form: toDraftFormSnapshot(args.packageForm),
  };
  storage.setItem(createDraftStorageKey(packageId), JSON.stringify(record));
  return record;
}

export function getRegisterDraft(packageId: string): RegisterDraftRecord | null {
  const storage = getStorage();
  if (!storage) return null;
  const id = String(packageId || '').trim();
  if (!id) return null;
  const raw = storage.getItem(createDraftStorageKey(id));
  if (!raw) return null;
  try {
    return parseDraftRecord(JSON.parse(raw));
  } catch {
    return null;
  }
}

export function listRegisterDrafts(): RegisterDraftListItem[] {
  return listRegisterDraftRecords().map((record) => ({
    packageId: record.packageId,
    packageName: record.packageName,
    savedAt: record.savedAt,
    pending: isRegisterDraftPending(record),
    readyForSubmit: isRegisterDraftReadyForSubmit(record),
    lastSubmitError: String(record.lastSubmitError || ''),
  }));
}

export function listRegisterDraftRecords(): RegisterDraftRecord[] {
  const storage = getStorage();
  if (!storage) return [];
  const items: RegisterDraftRecord[] = [];
  for (let i = 0; i < storage.length; i += 1) {
    const key = storage.key(i);
    if (!key || !key.startsWith(DRAFT_STORAGE_PREFIX)) continue;
    const raw = storage.getItem(key);
    if (!raw) continue;
    try {
      const record = parseDraftRecord(JSON.parse(raw));
      if (!record) continue;
      items.push(record);
    } catch {
      // ignore broken records
    }
  }
  return items.toSorted((a, b) => b.savedAt - a.savedAt);
}

export function updateRegisterDraftSubmitState(args: {
  packageId: string;
  submittedHash?: string;
  errorMessage?: string;
}): RegisterDraftRecord | null {
  const record = getRegisterDraft(args.packageId);
  if (!record) return null;
  const next: RegisterDraftRecord = {
    ...record,
    lastSubmitAt: Date.now(),
    lastSubmitError: String(args.errorMessage || ''),
    ...(args.errorMessage ? {} : { lastSubmittedHash: String(args.submittedHash || '') }),
  };
  const storage = getStorage();
  if (!storage) return null;
  storage.setItem(createDraftStorageKey(next.packageId), JSON.stringify(next));
  return next;
}

export function updateRegisterDraftTestState(args: {
  packageId: string;
  kind: RegisterDraftTestKind;
  testedHash: string;
}): RegisterDraftRecord | null {
  const record = getRegisterDraft(args.packageId);
  if (!record) return null;
  const testedHash = String(args.testedHash || '');
  if (!testedHash || testedHash !== String(record.contentHash || '')) {
    return null;
  }
  const next: RegisterDraftRecord = {
    ...record,
    ...(args.kind === 'installer' ? { installerTestedHash: testedHash } : { uninstallerTestedHash: testedHash }),
  };
  const storage = getStorage();
  if (!storage) return null;
  storage.setItem(createDraftStorageKey(next.packageId), JSON.stringify(next));
  return next;
}

export function deleteRegisterDraft(packageId: string): void {
  const storage = getStorage();
  if (!storage) return;
  const id = String(packageId || '').trim();
  if (!id) return;
  storage.removeItem(createDraftStorageKey(id));
}

export async function restoreRegisterDraft(record: RegisterDraftRecord): Promise<RegisterDraftRestoreResult> {
  const warnings: string[] = [];
  const source = (record.form || {}) as RegisterDraftFormSnapshot;
  const imageSnapshot = source.images || { thumbnail: null, info: [] };
  const thumbnail = imageSnapshot.thumbnail
    ? await restoreImageEntry(imageSnapshot.thumbnail, warnings, 'サムネイル')
    : null;
  const infoEntries = Array.isArray(imageSnapshot.info) ? imageSnapshot.info : [];
  const info: RegisterImageEntry[] = [];
  for (let i = 0; i < infoEntries.length; i += 1) {
    const restored = await restoreImageEntry(infoEntries[i], warnings, `説明画像${i + 1}`);
    info.push(restored);
  }
  const { images: _images, ...rest } = source;
  const packageForm: RegisterPackageForm = {
    ...(rest as Omit<RegisterPackageForm, 'images'>),
    images: {
      thumbnail,
      info,
    },
  };
  return {
    packageForm,
    packageSender: String(record.packageSender || ''),
    tags: normalizeArrayText(record.tags),
    warnings,
  };
}
