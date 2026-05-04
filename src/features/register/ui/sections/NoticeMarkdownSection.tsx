/**
 * 注意事項のmarkdown入力セクション
 */
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { RegisterNoticeMarkdownSectionProps } from '../types';
import MarkdownEditPreviewPanel from '../components/MarkdownEditPreviewPanel';
import useMarkdownPreview from '../hooks/useMarkdownPreview';
import { surface, text } from '@/components/ui/_styles';

export default function RegisterNoticeMarkdownSection({
  packageForm,
  onUpdatePackageField,
}: RegisterNoticeMarkdownSectionProps) {
  const { t } = useTranslation('register');
  const [noticeTab, setNoticeTab] = useState<'edit' | 'preview'>('edit');
  const noticePreviewHtml = useMarkdownPreview(packageForm.noticeText, noticeTab);

  return (
    <section className={surface.cardSection}>
      <div className="space-y-1">
        <h2 className={text.titleLg}>{t('noticeMarkdown.title')}</h2>
        <p className={text.bodySmMuted}>{t('noticeMarkdown.body')}</p>
      </div>
      <MarkdownEditPreviewPanel
        tab={noticeTab}
        onTabChange={setNoticeTab}
        previewHtml={noticePreviewHtml}
        previewMaxHeightClassName="max-h-[320px]"
        editContent={
          <div>
            <label className="sr-only" htmlFor="package-notice-text">
              {t('noticeMarkdown.title')}
            </label>
            <textarea
              id="package-notice-text"
              className="min-h-[260px] w-full resize-y rounded-b-xl rounded-t-none border-0 bg-white p-4 font-mono text-sm leading-relaxed text-slate-900 shadow-none focus-visible:outline-none focus-visible:ring-0 dark:bg-slate-800 dark:text-slate-100"
              value={packageForm.noticeText}
              onChange={(e) => onUpdatePackageField('noticeText', e.target.value)}
              placeholder={t('noticeMarkdown.placeholder')}
            />
          </div>
        }
      />
    </section>
  );
}
