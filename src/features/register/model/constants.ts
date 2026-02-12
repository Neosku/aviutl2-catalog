/**
 * パッケージ登録で共有する定数群のモジュール
 */
import { LICENSE_TEMPLATES } from '../../../utils/licenseTemplates.js';
import type { RegisterInstallerOption } from './types';

export const INSTALL_ACTIONS = ['download', 'extract', 'run', 'copy', 'delete'];
export const SPECIAL_INSTALL_ACTIONS = ['extract_sfx', 'run_auo_setup'];
export const UNINSTALL_ACTIONS = ['delete', 'run'];
export const ID_PATTERN = /^[A-Za-z0-9._-]+$/;

export const ACTION_LABELS: Record<string, string> = {
  download: 'ダウンロード',
  extract: 'ZIP展開',
  copy: 'コピー',
  run: 'EXE実行',
  delete: '削除',
  extract_sfx: '7zを展開',
  run_auo_setup: 'auo_setup2.exeを実行',
};

export const INSTALLER_SOURCES: RegisterInstallerOption[] = [
  { value: 'direct', label: '直接URL' },
  { value: 'github', label: 'GitHub Release' },
  { value: 'GoogleDrive', label: 'Google Drive' },
  { value: 'booth', label: 'BOOTH' },
];

export const SUBMIT_ACTIONS = {
  package: 'plugin',
};

export const PACKAGE_GUIDE_FALLBACK_URL =
  'https://github.com/Neosku/aviutl2-catalog-data/blob/main/register-package.md';

export const LICENSE_TEMPLATE_TYPES = new Set(Object.keys(LICENSE_TEMPLATES));

export const INSTALL_ACTION_OPTIONS: RegisterInstallerOption[] = INSTALL_ACTIONS.map((action) => ({
  value: action,
  label: ACTION_LABELS[action] || action,
}));

export const UNINSTALL_ACTION_OPTIONS: RegisterInstallerOption[] = UNINSTALL_ACTIONS.map((action) => ({
  value: action,
  label: ACTION_LABELS[action] || action,
}));
