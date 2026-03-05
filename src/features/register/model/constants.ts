/**
 * パッケージ登録で共有する定数群のモジュール
 */
import { LICENSE_TEMPLATE_TYPE_VALUES } from '../../../utils/licenseTemplates';
import { installActionRules, uninstallActionRules } from './installerRules';
import type { RegisterInstallerOption } from './types';

const INSTALL_ACTION_RULE_ENTRIES = Object.entries(installActionRules);

export const INSTALL_ACTIONS = INSTALL_ACTION_RULE_ENTRIES.filter(([, rule]) => !rule.special).map(
  ([action]) => action,
);
export const SPECIAL_INSTALL_ACTIONS = INSTALL_ACTION_RULE_ENTRIES.filter(([, rule]) => rule.special).map(
  ([action]) => action,
);
export const UNINSTALL_ACTIONS = Object.keys(uninstallActionRules);
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
export const LICENSE_TEMPLATE_TYPES = new Set<string>(LICENSE_TEMPLATE_TYPE_VALUES);
export const INSTALL_ACTION_OPTIONS: RegisterInstallerOption[] = INSTALL_ACTIONS.map((action) => ({
  value: action,
  label: ACTION_LABELS[action] || action,
}));
export const UNINSTALL_ACTION_OPTIONS: RegisterInstallerOption[] = UNINSTALL_ACTIONS.map((action) => ({
  value: action,
  label: ACTION_LABELS[action] || action,
}));
