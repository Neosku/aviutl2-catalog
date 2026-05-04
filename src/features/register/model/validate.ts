/**
 * 送信前・実行前バリデーションモジュール
 */
import { isHttpsUrl } from './helpers';
import { getInstallStepIssue, getInstallerSourceIssue, getUninstallStepIssue } from './installerRules';
import { getFileExtension } from './parse';
import { ID_PATTERN, INSTALL_ACTIONS, SPECIAL_INSTALL_ACTIONS, UNINSTALL_ACTIONS } from './constants';
import {
  isOtherRegisterLicenseType,
  isUnknownRegisterLicenseType,
  requiresTemplateCopyrightFields,
} from '@/utils/licenseTemplates';
import { i18n } from '@/i18n';
import type { RegisterPackageForm } from './types';

function getInstallerSourceMessage(form: RegisterPackageForm, mode: 'test' | 'submit'): string {
  const issue = getInstallerSourceIssue(form.installer);
  if (issue === 'direct') {
    return mode === 'test'
      ? i18n.t('register:validation.installerSourceDirectTest')
      : i18n.t('register:validation.installerSourceDirectSubmit');
  }
  if (issue === 'booth') {
    return mode === 'test'
      ? i18n.t('register:validation.installerSourceBoothTest')
      : i18n.t('register:validation.installerSourceBoothSubmit');
  }
  if (issue === 'github') {
    return mode === 'test'
      ? i18n.t('register:validation.installerSourceGithubTest')
      : i18n.t('register:validation.installerSourceGithubSubmit');
  }
  if (issue === 'GoogleDrive') {
    return mode === 'test'
      ? i18n.t('register:validation.installerSourceGoogleDriveTest')
      : i18n.t('register:validation.installerSourceGoogleDriveSubmit');
  }
  if (issue === 'missing') {
    return i18n.t('register:validation.installerSourceMissing');
  }
  return '';
}

function getInstallStepMessage(form: RegisterPackageForm, mode: 'test' | 'submit'): string {
  for (const step of form.installer.installSteps) {
    const issue = getInstallStepIssue(step);
    if (!issue) continue;
    if (issue === 'unsupported') {
      if (mode === 'test') return i18n.t('register:validation.installUnsupportedTest');
      const allowed = [...INSTALL_ACTIONS, ...SPECIAL_INSTALL_ACTIONS].join(', ');
      return i18n.t('register:validation.installUnsupportedSubmit', { allowed });
    }
    if (issue === 'path') {
      if (step.action === 'run')
        return mode === 'test'
          ? i18n.t('register:validation.installRunPathTest')
          : i18n.t('register:validation.installRunPathSubmit');
      if (step.action === 'run_auo_setup') return i18n.t('register:validation.installRunAuoSetupPath');
      if (step.action === 'delete')
        return mode === 'test'
          ? i18n.t('register:validation.installDeletePathTest')
          : i18n.t('register:validation.installDeletePathSubmit');
      return i18n.t('register:validation.installTargetPath');
    }
    if (issue === 'from_to') {
      return mode === 'test'
        ? i18n.t('register:validation.installCopyPathsTest')
        : i18n.t('register:validation.installCopyPathsSubmit');
    }
    return i18n.t('register:validation.installElevate');
  }
  return '';
}

function getUninstallStepMessage(form: RegisterPackageForm, mode: 'test' | 'submit'): string {
  for (const step of form.installer.uninstallSteps) {
    const issue = getUninstallStepIssue(step);
    if (!issue) continue;
    if (issue === 'unsupported') {
      return mode === 'test'
        ? i18n.t('register:validation.uninstallUnsupportedTest')
        : i18n.t('register:validation.uninstallUnsupportedSubmit', { allowed: UNINSTALL_ACTIONS.join(', ') });
    }
    if (issue === 'path') {
      if (step.action === 'run')
        return mode === 'test'
          ? i18n.t('register:validation.installRunPathTest')
          : i18n.t('register:validation.uninstallRunPathSubmit');
      return mode === 'test'
        ? i18n.t('register:validation.installDeletePathTest')
        : i18n.t('register:validation.installDeletePathSubmit');
    }
    return mode === 'test'
      ? i18n.t('register:validation.uninstallElevateTest')
      : i18n.t('register:validation.uninstallElevateSubmit');
  }
  return '';
}

export function validateInstallerForTest(form: RegisterPackageForm): string {
  if (!form.installer.installSteps.length) return i18n.t('register:validation.installerStepsRequired');
  return getInstallerSourceMessage(form, 'test') || getInstallStepMessage(form, 'test');
}

export function validateUninstallerForTest(form: RegisterPackageForm): string {
  if (!form.installer.uninstallSteps.length) return i18n.t('register:validation.uninstallerStepsRequired');
  return getUninstallStepMessage(form, 'test');
}

export function validatePackageForm(form: RegisterPackageForm): string {
  if (!form.id.trim()) return i18n.t('register:validation.idRequired');
  if (!ID_PATTERN.test(form.id.trim())) return i18n.t('register:validation.idInvalid');
  if (!form.id.trim().includes('.')) return i18n.t('register:validation.idFormat');
  if (!form.name.trim()) return i18n.t('register:validation.nameRequired');
  if (!form.author.trim()) return i18n.t('register:validation.authorRequired');
  if (!form.type.trim()) return i18n.t('register:validation.typeRequired');
  if (!form.summary.trim()) return i18n.t('register:validation.summaryRequired');
  if (form.summary.trim().length > 35) return i18n.t('register:validation.summaryTooLong');
  if (!form.repoURL.trim()) return i18n.t('register:validation.repoRequired');
  const descriptionMode = form.descriptionMode === 'external' ? 'external' : 'inline';
  if (descriptionMode === 'external') {
    const externalUrl = String(form.descriptionUrl || '').trim();
    if (!isHttpsUrl(externalUrl)) return i18n.t('register:validation.descriptionUrlInvalid');
  } else if (!form.descriptionText.trim()) {
    return i18n.t('register:validation.descriptionRequired');
  }
  const changelogMode = form.changelogMode === 'external' ? 'external' : 'inline';
  if (changelogMode === 'external') {
    const externalUrl = String(form.changelogUrl || '').trim();
    if (!isHttpsUrl(externalUrl)) return i18n.t('register:validation.changelogUrlInvalid');
  }
  if (!form.licenses.length) return i18n.t('register:validation.licenseRequired');
  // ライセンスは UI 表示都合ではなく、最終 payload の成立条件で検証する。
  for (const license of form.licenses) {
    const type = String(license.type || '').trim();
    if (!type) return i18n.t('register:validation.licenseTypeRequired');
    if (isOtherRegisterLicenseType(type) && !String(license.licenseName || '').trim())
      return i18n.t('register:validation.licenseNameRequired');
    const needsCustomBody =
      isOtherRegisterLicenseType(type) ||
      (!isUnknownRegisterLicenseType(type) &&
        (license.isCustom || (license.licenseBody && license.licenseBody.trim().length > 0)));
    if (needsCustomBody && !String(license.licenseBody || '').trim())
      return i18n.t('register:validation.licenseBodyRequired');
    const usesTemplate = !isUnknownRegisterLicenseType(type) && !isOtherRegisterLicenseType(type) && !license.isCustom;
    const requiresCopyright = usesTemplate && requiresTemplateCopyrightFields(type);
    if (requiresCopyright) {
      const entries = Array.isArray(license.copyrights) ? license.copyrights : [];
      const hasCopyright = entries.some((c) => String(c?.years || '').trim() && String(c?.holder || '').trim());
      if (!hasCopyright) return i18n.t('register:validation.licenseCopyrightRequired');
    }
  }
  const sourceMessage = getInstallerSourceMessage(form, 'submit');
  if (sourceMessage) return sourceMessage;
  // install/uninstall の action 制約は送信先スキーマに合わせて厳密に制限する。
  const installStepMessage = getInstallStepMessage(form, 'submit');
  if (installStepMessage) return installStepMessage;
  const uninstallStepMessage = getUninstallStepMessage(form, 'submit');
  if (uninstallStepMessage) return uninstallStepMessage;
  for (const step of form.installer.installSteps) {
    if (step.action === 'run' && step.elevate && typeof step.elevate !== 'boolean') {
      return i18n.t('register:validation.installRunElevateBoolean');
    }
  }
  for (const step of form.installer.uninstallSteps) {
    if (step.action === 'run' && step.elevate && typeof step.elevate !== 'boolean') {
      return i18n.t('register:validation.uninstallRunElevateBoolean');
    }
  }
  if (!form.versions.length) return i18n.t('register:validation.versionsRequired');
  // バージョンごとの file は配布実体に直結するため、欠落を許可しない。
  for (const ver of form.versions) {
    if (!ver.version.trim()) return i18n.t('register:validation.versionNameRequired');
    if (!ver.release_date.trim()) return i18n.t('register:validation.versionDateRequired');
    if (!ver.files.length) return i18n.t('register:validation.versionFilesRequired');
    for (const file of ver.files) {
      if (!file.path.trim()) return i18n.t('register:validation.versionFilePathRequired');
      if (!file.hash.trim()) return i18n.t('register:validation.versionFileHashRequired');
      if (file.hash.trim().length !== 32) return i18n.t('register:validation.versionFileHashLength');
    }
  }
  if (form.images.thumbnail?.file && !getFileExtension(form.images.thumbnail.file.name)) {
    return i18n.t('register:validation.thumbnailExtension');
  }
  return '';
}
