/**
 * フォームの初期値・空要素ファクトリ群
 */
import { generateKey } from './helpers';
import type {
  RegisterCopyright,
  RegisterInstallerState,
  RegisterLicense,
  RegisterPackageForm,
  RegisterVersion,
  RegisterVersionFile,
} from './types';

export function createEmptyInstaller(): RegisterInstallerState {
  return {
    sourceType: 'direct',
    directUrl: '',
    boothUrl: '',
    githubOwner: '',
    githubRepo: '',
    githubPattern: '',
    googleDriveId: '',
    installSteps: [],
    uninstallSteps: [],
  };
}

export function createEmptyVersionFile(): RegisterVersionFile {
  return {
    key: generateKey(),
    path: '',
    hash: '',
    fileName: '',
  };
}

export function createEmptyVersion(): RegisterVersion {
  const now = new Date();
  const today = new Intl.DateTimeFormat('ja-JP', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    timeZone: 'Asia/Tokyo',
  })
    .format(now)
    .replace(/\//g, '-');
  return {
    key: generateKey(),
    version: '',
    release_date: today,
    files: [createEmptyVersionFile()],
  };
}

export function createEmptyCopyright(): RegisterCopyright {
  return {
    key: generateKey(),
    years: '',
    holder: '',
  };
}

export function createEmptyLicense(): RegisterLicense {
  return {
    key: generateKey(),
    type: '',
    licenseName: '',
    isCustom: false,
    licenseBody: '',
    copyrights: [createEmptyCopyright()],
  };
}

export function createEmptyPackageForm(): RegisterPackageForm {
  return {
    id: '',
    name: '',
    author: '',
    originalAuthor: '',
    type: '',
    summary: '',
    niconiCommonsId: '',
    descriptionText: '',
    descriptionPath: '',
    descriptionMode: 'inline',
    descriptionUrl: '',
    repoURL: '',
    licenses: [createEmptyLicense()],
    tagsText: '',
    dependenciesText: '',
    installer: createEmptyInstaller(),
    versions: [],
    images: {
      thumbnail: null,
      info: [],
    },
  };
}
