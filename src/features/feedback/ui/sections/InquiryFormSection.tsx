import React from 'react';
import { INQUIRY_FIELDS } from '../../model/fieldNames';
import FeedbackVisibilityBadge from '../components/FeedbackVisibilityBadge';
import FeedbackAttachmentSection from './FeedbackAttachmentSection';
import FeedbackBasicFieldsSection from './FeedbackBasicFieldsSection';
import type { InquiryFormSectionProps } from '../types';

export default function InquiryFormSection({
  inquiry,
  attachments,
  onInquiryChange,
  onFilesChange,
  onRemoveAttachment,
}: InquiryFormSectionProps) {
  return (
    <>
      <div className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700 dark:border-slate-800 dark:bg-slate-900/60 dark:text-slate-300">
        <div className="mb-1 flex items-center gap-2 font-semibold">
          <FeedbackVisibilityBadge type="private" />
          <span>非公開設定</span>
        </div>
        <div className="text-xs leading-relaxed opacity-90">
          ご意見・お問い合わせの内容は公開されません。開発者のみが確認します
        </div>
      </div>

      <FeedbackBasicFieldsSection
        idPrefix="inq"
        names={INQUIRY_FIELDS}
        values={inquiry}
        onChange={onInquiryChange}
        titlePlaceholder="件名を入力してください"
        detailPlaceholder="ご意見やお問い合わせ内容を詳しく入力してください"
        contactPlaceholder="メールアドレスやXアカウント（必要に応じて開発者から連絡します）"
      />

      <div className="space-y-6 border-t border-slate-100 pt-6 dark:border-slate-800">
        <FeedbackAttachmentSection
          attachments={attachments}
          onFilesChange={onFilesChange}
          onRemoveAttachment={onRemoveAttachment}
          label="添付ファイル"
          optionalLabel="(任意)"
        />
      </div>
    </>
  );
}
