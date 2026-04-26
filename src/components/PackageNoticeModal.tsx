import Button from '@/components/ui/Button';
import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { cn } from '@/lib/cn';
import { layout, overlay, surface } from '@/components/ui/_styles';

interface PackageNoticeModalProps {
  open: boolean;
  title: string;
  html: string;
  onConfirm: () => void;
  onClose: () => void;
}

export default function PackageNoticeModal({ open, title, html, onConfirm, onClose }: PackageNoticeModalProps) {
  const { t } = useTranslation(['package', 'common']);
  const htmlMarkup = useMemo(() => ({ __html: html }), [html]);
  if (!open) return null;

  return (
    <div className={layout.fixedCenter} role="dialog" aria-modal="true" aria-labelledby="package-notice-modal-title">
      <button type="button" aria-label={t('common:actions.close')} className={overlay.backdrop} onClick={onClose} />
      <div className={cn(surface.card, 'relative w-full max-w-2xl shadow-xl')}>
        <div className={surface.sectionDivider}>
          <h3 id="package-notice-modal-title" className="text-lg font-bold">
            {t('package:noticeModal.title', { name: title })}
          </h3>
        </div>
        <div className="px-6 py-4">
          <div className="prose prose-slate max-h-[60vh] max-w-none overflow-auto dark:prose-invert" dangerouslySetInnerHTML={htmlMarkup} />
        </div>
        <div className={layout.footerEnd}>
          <Button type="button" variant="secondary" onClick={onClose}>
            {t('package:noticeModal.cancel')}
          </Button>
          <Button type="button" variant="primary" onClick={onConfirm}>
            {t('package:noticeModal.continue')}
          </Button>
        </div>
      </div>
    </div>
  );
}
