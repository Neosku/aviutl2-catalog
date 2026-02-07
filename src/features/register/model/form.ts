/**
 * register モジュールのエントリーポイント
 */
export {
  ACTION_LABELS,
  ID_PATTERN,
  INSTALL_ACTION_OPTIONS,
  INSTALL_ACTIONS,
  INSTALLER_SOURCES,
  LICENSE_TEMPLATE_TYPES,
  PACKAGE_GUIDE_FALLBACK_URL,
  SPECIAL_INSTALL_ACTIONS,
  SUBMIT_ACTIONS,
  UNINSTALL_ACTION_OPTIONS,
  UNINSTALL_ACTIONS,
} from './constants';

export {
  createEmptyCopyright,
  createEmptyInstaller,
  createEmptyLicense,
  createEmptyPackageForm,
  createEmptyVersion,
  createEmptyVersionFile,
} from './factories';

export { entryToForm, getFileExtension } from './parse';

export {
  buildInstallerPayload,
  buildInstallerTestItem,
  buildPackageEntry,
  computeHashFromFile,
  computeLatestVersion,
} from './build';

export { validateInstallerForTest, validatePackageForm, validateUninstallerForTest } from './validate';
