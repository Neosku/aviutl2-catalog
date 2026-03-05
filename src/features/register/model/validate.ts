/**
 * 送信前・実行前バリデーションモジュール
 */
import { isHttpsUrl } from './helpers';
import { getInstallStepIssue, getInstallerSourceIssue, getUninstallStepIssue } from './installerRules';
import { getFileExtension } from './parse';
import { ID_PATTERN, INSTALL_ACTIONS, SPECIAL_INSTALL_ACTIONS, UNINSTALL_ACTIONS } from './constants';
import { requiresTemplateCopyrightFields } from '../../../utils/licenseTemplates';
import type { RegisterPackageForm } from './types';

function getInstallerSourceMessage(form: RegisterPackageForm, mode: 'test' | 'submit'): string {
  const issue = getInstallerSourceIssue(form.installer);
  if (issue === 'direct') {
    return mode === 'test'
      ? 'ダウンロード URL を入力してください'
      : 'installer.source の direct URL を入力してください';
  }
  if (issue === 'booth') {
    return mode === 'test' ? 'BOOTH URL を入力してください' : 'installer.source の booth URL を入力してください';
  }
  if (issue === 'github') {
    return mode === 'test'
      ? 'GitHub ID/レポジトリ名/正規表現パターンすべてを入力してください'
      : 'installer.source github の owner/repo/pattern は全て必須です';
  }
  if (issue === 'GoogleDrive') {
    return mode === 'test' ? 'ファイル ID を入力してください' : 'GoogleDrive のファイル ID を入力してください';
  }
  if (issue === 'missing') {
    return 'installer.source を選択してください';
  }
  return '';
}

function getInstallStepMessage(form: RegisterPackageForm, mode: 'test' | 'submit'): string {
  for (const step of form.installer.installSteps) {
    const issue = getInstallStepIssue(step);
    if (!issue) continue;
    if (issue === 'unsupported') {
      if (mode === 'test') return '未対応のインストール手順が含まれています';
      const allowed = [...INSTALL_ACTIONS, ...SPECIAL_INSTALL_ACTIONS].join(', ');
      return `install の action は ${allowed} のみ使用できます`;
    }
    if (issue === 'path') {
      if (step.action === 'run')
        return mode === 'test' ? 'EXE実行の実行パスを指定してください' : 'run の path は必須です';
      if (step.action === 'run_auo_setup') return 'run_auo_setup の path は必須です';
      if (step.action === 'delete')
        return mode === 'test' ? '削除するパスを指定してください' : 'delete の path は必須です';
      return '対象パスを入力してください';
    }
    if (issue === 'from_to') {
      return mode === 'test' ? 'コピー元/コピー先のパスを指定してください' : 'copy の from / to は必須です';
    }
    return 'elevate は action: run のときのみ指定できます';
  }
  return '';
}

function getUninstallStepMessage(form: RegisterPackageForm, mode: 'test' | 'submit'): string {
  for (const step of form.installer.uninstallSteps) {
    const issue = getUninstallStepIssue(step);
    if (!issue) continue;
    if (issue === 'unsupported') {
      return mode === 'test'
        ? '未対応のアンインストール手順が含まれています'
        : `uninstall の action は ${UNINSTALL_ACTIONS.join(', ')} のみ使用できます`;
    }
    if (issue === 'path') {
      if (step.action === 'run')
        return mode === 'test' ? 'EXE実行の実行パスを指定してください' : 'uninstall run の path は必須です';
      return mode === 'test' ? '削除するパスを指定してください' : 'delete の path は必須です';
    }
    return mode === 'test'
      ? '管理者権限の指定は実行ステップでのみ使用できます'
      : 'uninstall の elevate は action: run のときのみ指定できます';
  }
  return '';
}

export function validateInstallerForTest(form: RegisterPackageForm): string {
  if (!form.installer.installSteps.length) return 'インストール手順を追加してください';
  return getInstallerSourceMessage(form, 'test') || getInstallStepMessage(form, 'test');
}

export function validateUninstallerForTest(form: RegisterPackageForm): string {
  if (!form.installer.uninstallSteps.length) return 'アンインストール手順を追加してください';
  return getUninstallStepMessage(form, 'test');
}

export function validatePackageForm(form: RegisterPackageForm): string {
  if (!form.id.trim()) return 'ID は必須です';
  if (!ID_PATTERN.test(form.id.trim())) return 'ID は英数字・ドット・アンダーバー・ハイフンのみ使用できます';
  if (!form.name.trim()) return 'パッケージ名は必須です';
  if (!form.author.trim()) return '作者名は必須です';
  if (!form.type.trim()) return '種類は必須です';
  if (!form.summary.trim()) return '概要は必須です';
  if (form.summary.trim().length > 35) return '概要は35文字以内で入力してください';
  if (!form.repoURL.trim()) return 'パッケージのサイトは必須です';
  const descriptionMode = form.descriptionMode === 'external' ? 'external' : 'inline';
  if (descriptionMode === 'external') {
    const externalUrl = String(form.descriptionUrl || '').trim();
    if (!isHttpsUrl(externalUrl)) return '外部Markdown のURLは https:// で始まる形式で入力してください';
  } else if (!form.descriptionText.trim()) {
    return '詳細を入力してください';
  }
  if (!form.licenses.length) return 'ライセンスを1件以上追加してください';
  // ライセンスは UI 表示都合ではなく、最終 payload の成立条件で検証する。
  for (const license of form.licenses) {
    const type = String(license.type || '').trim();
    if (!type) return 'ライセンスの種類を選択してください';
    if (type === 'その他' && !String(license.licenseName || '').trim()) return 'ライセンス名を入力してください';
    const needsCustomBody =
      type === 'その他' ||
      (type !== '不明' && (license.isCustom || (license.licenseBody && license.licenseBody.trim().length > 0)));
    if (needsCustomBody && !String(license.licenseBody || '').trim()) return 'ライセンス本文を入力してください';
    const usesTemplate = type !== '不明' && type !== 'その他' && !license.isCustom;
    const requiresCopyright = usesTemplate && requiresTemplateCopyrightFields(type);
    if (requiresCopyright) {
      const entries = Array.isArray(license.copyrights) ? license.copyrights : [];
      const hasCopyright = entries.some((c) => String(c?.years || '').trim() && String(c?.holder || '').trim());
      if (!hasCopyright) return '標準ライセンスを使用する場合は著作権者を入力してください';
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
      return 'run の elevate は true/false で指定してください';
    }
  }
  for (const step of form.installer.uninstallSteps) {
    if (step.action === 'run' && step.elevate && typeof step.elevate !== 'boolean') {
      return 'uninstall run の elevate は true/false で指定してください';
    }
  }
  if (!form.versions.length) return 'バージョン情報を最低1件追加してください';
  // バージョンごとの file は配布実体に直結するため、欠落を許可しない。
  for (const ver of form.versions) {
    if (!ver.version.trim()) return 'version の version を入力してください';
    if (!ver.release_date.trim()) return 'version の release_date を入力してください';
    if (!ver.files.length) return 'version の file を1件以上追加してください';
    for (const file of ver.files) {
      if (!file.path.trim()) return 'version.file の path を入力してください';
      if (!file.hash.trim()) return 'version.file の XXH3_128 を計算してください';
      if (file.hash.trim().length !== 32) return 'XXH3_128 は32桁の16進数で入力してください';
    }
  }
  if (form.images.thumbnail?.file && !getFileExtension(form.images.thumbnail.file.name)) {
    return 'サムネイルのファイル拡張子を確認してください';
  }
  return '';
}
