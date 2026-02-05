/**
 * 送信前・実行前バリデーションモジュール
 */
import { isHttpsUrl } from './helpers';
import { getFileExtension } from './parse';
import { ID_PATTERN, INSTALL_ACTIONS, SPECIAL_INSTALL_ACTIONS, UNINSTALL_ACTIONS } from './constants';
import type { RegisterPackageForm } from './types';

export function validateInstallerForTest(form: RegisterPackageForm): string {
  const sourceType = form.installer.sourceType;
  if (!form.installer.installSteps.length) return 'インストール手順を追加してください';
  if (sourceType === 'direct') {
    if (!form.installer.directUrl.trim()) return 'ダウンロード URL を入力してください';
  } else if (sourceType === 'booth') {
    if (!form.installer.boothUrl.trim()) return 'BOOTH URL を入力してください';
  } else if (sourceType === 'github') {
    if (
      !form.installer.githubOwner.trim() ||
      !form.installer.githubRepo.trim() ||
      !form.installer.githubPattern.trim()
    ) {
      return 'GitHub ID/レポジトリ名/正規表現パターンすべてを入力してください';
    }
  } else if (sourceType === 'GoogleDrive') {
    if (!form.installer.googleDriveId.trim()) return 'ファイル ID を入力してください';
  }

  for (const step of form.installer.installSteps) {
    if (step.action === 'run') {
      if (!step.path.trim()) return 'EXE実行の実行パスを指定してください';
    }
    if (step.action === 'copy') {
      if (!step.from.trim() || !step.to.trim()) return 'コピー元/コピー先のパスを指定してください';
    }
  }
  return '';
}

export function validateUninstallerForTest(form: RegisterPackageForm): string {
  if (!form.installer.uninstallSteps.length) return 'アンインストール手順を追加してください';
  for (const step of form.installer.uninstallSteps) {
    if (step.action === 'run') {
      if (!step.path.trim()) return 'EXE実行の実行パスを指定してください';
    }
    if (step.action === 'delete') {
      if (!step.path.trim()) return '削除するパスを指定してください';
    }
  }
  return '';
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
    const requiresCopyright = usesTemplate && type !== 'CC0-1.0';
    if (requiresCopyright) {
      const entries = Array.isArray(license.copyrights) ? license.copyrights : [];
      const hasCopyright = entries.some((c) => String(c?.years || '').trim() && String(c?.holder || '').trim());
      if (!hasCopyright) return '標準ライセンスを使用する場合は著作権者を入力してください';
    }
  }
  const sourceType = form.installer.sourceType;
  if (sourceType === 'direct') {
    if (!form.installer.directUrl.trim()) return 'installer.source の direct URL を入力してください';
  } else if (sourceType === 'booth') {
    if (!form.installer.boothUrl.trim()) return 'installer.source の booth URL を入力してください';
  } else if (sourceType === 'github') {
    if (
      !form.installer.githubOwner.trim() ||
      !form.installer.githubRepo.trim() ||
      !form.installer.githubPattern.trim()
    ) {
      return 'installer.source github の owner/repo/pattern は全て必須です';
    }
  } else if (sourceType === 'GoogleDrive') {
    if (!form.installer.googleDriveId.trim()) return 'GoogleDrive のファイル ID を入力してください';
  } else {
    return 'installer.source を選択してください';
  }
  // install/uninstall の action 制約は送信先スキーマに合わせて厳密に制限する。
  for (const step of form.installer.installSteps) {
    const isStandardAction = INSTALL_ACTIONS.includes(step.action);
    const isSpecialAction = SPECIAL_INSTALL_ACTIONS.includes(step.action);
    if (!isStandardAction && !isSpecialAction) {
      const allowed = [...INSTALL_ACTIONS].join(', ');
      return `install の action は ${allowed} のみ使用できます`;
    }
    if (step.action === 'run') {
      if (!step.path.trim()) return 'run の path は必須です';
      if (step.elevate && typeof step.elevate !== 'boolean') return 'run の elevate は true/false で指定してください';
    } else if (step.elevate) {
      return 'elevate は action: run のときのみ指定できます';
    }
    if (step.action === 'copy') {
      if (!step.from.trim() || !step.to.trim()) return 'copy の from / to は必須です';
    }
  }
  for (const step of form.installer.uninstallSteps) {
    if (!UNINSTALL_ACTIONS.includes(step.action)) {
      return `uninstall の action は ${UNINSTALL_ACTIONS.join(', ')} のみ使用できます`;
    }
    if (step.action === 'run') {
      if (!step.path.trim()) return 'uninstall run の path は必須です';
      if (step.elevate && typeof step.elevate !== 'boolean')
        return 'uninstall run の elevate は true/false で指定してください';
    } else if (step.elevate) {
      return 'uninstall の elevate は action: run のときのみ指定できます';
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
