import React from 'react';
import { BUG_FIELDS } from '../../model/fieldNames';
import FeedbackVisibilityBadge from '../components/FeedbackVisibilityBadge';
import FeedbackAttachmentSection from './FeedbackAttachmentSection';
import FeedbackBasicFieldsSection from './FeedbackBasicFieldsSection';
import FeedbackEnvironmentSection from './FeedbackEnvironmentSection';
import FeedbackLogSection from './FeedbackLogSection';
import type { BugReportFormSectionProps } from '../types';
import { layout, surface, text } from '@/components/ui/_styles';
import { cn } from '@/lib/cn';

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
      <div
        className={cn(
          surface.infoBox,
          'border-blue-100 bg-blue-50 text-blue-800 dark:border-blue-900/30 dark:bg-blue-900/10 dark:text-blue-200',
        )}
      >
        <div className={layout.headerInlineStrong}>
          <FeedbackVisibilityBadge type="public" />
          <span>公開設定</span>
        </div>
        <div className={text.mutedXsRelaxedFaded}>
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

      <div className={surface.sectionTopBorder}>
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
