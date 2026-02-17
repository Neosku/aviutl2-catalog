import React from 'react';
import { BUG_FIELDS } from '../../model/fieldNames';
import FeedbackVisibilityBadge from '../components/FeedbackVisibilityBadge';
import FeedbackAttachmentSection from './FeedbackAttachmentSection';
import FeedbackBasicFieldsSection from './FeedbackBasicFieldsSection';
import FeedbackEnvironmentSection from './FeedbackEnvironmentSection';
import FeedbackLogSection from './FeedbackLogSection';
import type { BugReportFormSectionProps } from '../types';

export default function BugReportFormSection({
  bug,
  loadingDiag,
  appVersion,
  pluginsCount,
  device,
  appLog,
  attachments,
  onBugChange,
  onFilesChange,
  onRemoveAttachment,
}: BugReportFormSectionProps) {
  return (
    <>
      <div className="rounded-lg border border-blue-100 bg-blue-50 px-4 py-3 text-sm text-blue-800 dark:border-blue-900/30 dark:bg-blue-900/10 dark:text-blue-200">
        <div className="mb-1 flex items-center gap-2 font-semibold">
          <FeedbackVisibilityBadge type="public" />
          <span>公開設定</span>
        </div>
        <div className="text-xs leading-relaxed opacity-90">
          <strong>タイトル</strong> と <strong>詳細</strong>{' '}
          は公開されます。連絡先、添付ファイル、デバイス情報などのメタデータは公開されません
        </div>
      </div>

      <FeedbackBasicFieldsSection
        idPrefix="bug"
        names={BUG_FIELDS}
        values={bug}
        onChange={onBugChange}
        titlePlaceholder="不具合の概要を入力してください"
        detailPlaceholder="発生状況、再現手順、期待する動作などを詳しく入力してください"
        contactPlaceholder="メールアドレスやXアカウント（開発者から連絡する場合があります）"
      />

      <div className="space-y-6 border-t border-slate-100 pt-6 dark:border-slate-800">
        <FeedbackAttachmentSection
          attachments={attachments}
          onFilesChange={onFilesChange}
          onRemoveAttachment={onRemoveAttachment}
          label="添付ファイル"
        />
        <FeedbackEnvironmentSection
          bug={bug}
          loading={loadingDiag}
          appVersion={appVersion}
          pluginsCount={pluginsCount}
          device={device}
          onBugChange={onBugChange}
        />
        <FeedbackLogSection
          loading={loadingDiag}
          includeLog={bug.includeLog}
          appLog={appLog}
          onBugChange={onBugChange}
        />
      </div>
    </>
  );
}
