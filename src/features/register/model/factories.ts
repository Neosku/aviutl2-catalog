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

function getTodayInTokyoISO(): string {
  const parts = new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    timeZone: 'Asia/Tokyo',
  }).formatToParts(new Date());

  let year = '';
  let month = '';
  let day = '';

  for (const part of parts) {
    if (part.type === 'year') year = part.value;
    if (part.type === 'month') month = part.value;
    if (part.type === 'day') day = part.value;
  }

  return `${year}-${month}-${day}`;
}

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
  return {
    key: generateKey(),
    version: '',
    release_date: getTodayInTokyoISO(),
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
    legacyId: '',
    packageRole: 'primaryPackage',
    addedAt: getTodayInTokyoISO(),
    sourceLocale: 'ja',
    name: '',
    author: '',
    originalAuthor: '',
    deprecationEnabled: false,
    deprecationMessage: '',
    type: '',
    summary: '',
    niconiCommonsId: '',
    descriptionText: '',
    descriptionPath: '',
    descriptionMode: 'inline',
    descriptionUrl: '',
    changelogMode: 'inline',
    changelogUrl: '',
    changelogPath: '',
    changelogText: '',
    noticePath: '',
    noticeText: '',
    repoURL: '',
    licenses: [createEmptyLicense()],
    tagsText: '',
    relationRequiresText: '',
    relationRecommendsText: '',
    relationConflictsText: '',
    relationSimilarText: '',
    relationReplacesText: '',
    relationForkOfText: '',
    installer: createEmptyInstaller(),
    versions: [],
    images: {
      thumbnail: null,
      info: [],
    },
  };
}
