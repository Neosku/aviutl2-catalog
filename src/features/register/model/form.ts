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

export { entryToForm, getFileExtension, sourcePackageToForm } from './parse';

export { applyCatalogJsonPatch } from './catalogPatch';
export {
  AU2PKG_ALLOWED_ROOTS,
  buildAu2pkgInstallSteps,
  buildAu2pkgUninstallSteps,
  collectAu2pkgEntries,
  isAu2pkgFileName,
  summarizeAu2pkgFiles,
} from './au2pkg';

export {
  buildInstallerPayload,
  buildInstallerTestItem,
  buildPackageEntry,
  buildSourceSubmitPayload,
  computeHashFromFile,
  computeLatestVersion,
} from './build';

export { validateInstallerForTest, validatePackageForm, validateUninstallerForTest } from './validate';
