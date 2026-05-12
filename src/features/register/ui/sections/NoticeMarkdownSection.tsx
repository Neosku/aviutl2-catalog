/**
 * 注意事項のmarkdown入力セクション
 */
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import PackageNoticeModal from '@/components/PackageNoticeModal';
import Button from '@/components/ui/Button';
import { layout, surface, text } from '@/components/ui/_styles';
import { renderMarkdown } from '@/utils/markdown';
import type { RegisterNoticeMarkdownSectionProps } from '../types';

export default function RegisterNoticeMarkdownSection({
  packageForm,
  onUpdatePackageField,
}: RegisterNoticeMarkdownSectionProps) {
  const { t } = useTranslation(['register', 'common']);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewHtml, setPreviewHtml] = useState('');
  const hasNoticeText = Boolean(packageForm.noticeText.trim());

  const openPreview = () => {
    setPreviewHtml(renderMarkdown(packageForm.noticeText));
    setPreviewOpen(true);
  };

  return (
    <section className={surface.cardSection}>
      <div className="space-y-1">
        <h2 className={text.titleLg}>{t('noticeMarkdown.title')}</h2>
        <p className={text.bodySmMuted}>{t('noticeMarkdown.body')}</p>
      </div>

      <div className={layout.rowBetweenWrapGap2}>
        <label className={text.labelSm} htmlFor="package-notice-text">
          {t('noticeMarkdown.title')}
        </label>
        <Button variant="muted" size="compact" type="button" onClick={openPreview} disabled={!hasNoticeText}>
          {t('common:actions.preview')}
        </Button>
      </div>

      <div className="space-y-2">
        <textarea
          id="package-notice-text"
          className="min-h-[260px] font-mono text-sm leading-relaxed"
          value={packageForm.noticeText}
          onChange={(e) => onUpdatePackageField('noticeText', e.target.value)}
          placeholder={t('noticeMarkdown.placeholder')}
        />
      </div>

      <PackageNoticeModal
        open={previewOpen}
        title={packageForm.name || packageForm.id || t('noticeMarkdown.title')}
        html={previewHtml}
        onClose={() => setPreviewOpen(false)}
        showConfirm={false}
      />
    </section>
  );
}
