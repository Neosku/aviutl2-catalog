import { useEffect, useMemo, useState } from 'react';
import { Calendar } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Alert } from '@/components/ui/Alert';
import Badge from '@/components/ui/Badge';
import Button from '@/components/ui/Button';
import { layout, overlay, surface, text } from '@/components/ui/_styles';
import { cn } from '@/lib/cn';

interface UpdateDialogProps {
  open: boolean;
  version?: string;
  notes?: string;
  busy?: boolean;
  error?: string;
  onConfirm: () => void;
  onCancel: () => void;
  publishedOn?: string;
}

export default function UpdateDialog({
  open,
  version,
  notes,
  busy = false,
  error,
  onConfirm,
  onCancel,
  publishedOn,
}: UpdateDialogProps) {
  const { t, i18n } = useTranslation('common');
  const [markdownHtml, setMarkdownHtml] = useState('');
  const markdownMarkup = useMemo(() => ({ __html: markdownHtml }), [markdownHtml]);
  const publishedOnLabel = useMemo(() => {
    if (!publishedOn) return '';
    const parsed = new Date(publishedOn);
    if (Number.isNaN(parsed.getTime())) return publishedOn;

    try {
      return new Intl.DateTimeFormat(i18n.language, { dateStyle: 'medium' }).format(parsed);
    } catch {
      return publishedOn;
    }
  }, [i18n.language, publishedOn]);

  useEffect(() => {
    if (!notes) {
      setMarkdownHtml('');
      return;
    }

    let cancelled = false;
    void (async () => {
      const { renderMarkdown } = await import('@/utils/markdown');
      if (!cancelled) {
        setMarkdownHtml(renderMarkdown(notes));
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [notes]);

  if (!open) return null;

  const handleBackdrop = () => {
    if (busy) return;
    onCancel();
  };

  return (
    <div className={layout.fixedCenter}>
      <button type="button" aria-label={t('actions.close')} className={overlay.backdrop} onClick={handleBackdrop} />
      <div
        className={cn(
          surface.cardOverflow,
          'relative flex max-h-[calc(100dvh-2rem)] w-full max-w-2xl flex-col shadow-xl',
        )}
        role="dialog"
        aria-modal="true"
        aria-labelledby="update-title"
      >
        <div className={cn(layout.rowBetweenWrapStartGap4, surface.sectionDivider)}>
          <div>
            <span className="text-xs font-semibold uppercase tracking-widest text-blue-500">
              {t('updateDialog.eyebrow')}
            </span>
            <h3 className={text.titleLg} id="update-title">
              {t('updateDialog.title')}
            </h3>
            {publishedOnLabel && (
              <p className={cn(layout.inlineGap2, 'mt-1', text.mutedXs)}>
                <Calendar size={14} />
                <span>{t('updateDialog.publishedOn', { date: publishedOnLabel })}</span>
              </p>
            )}
          </div>
          {version && (
            <Badge
              variant="primary"
              shape="pill"
              size="sm"
              className="border-blue-600 bg-blue-600 text-white dark:border-blue-500 dark:bg-blue-500"
            >
              v{version}
            </Badge>
          )}
        </div>
        <div className="flex min-h-0 flex-1 flex-col px-6 py-4">
          {error && (
            <Alert variant="danger" className="mb-4 rounded-xl">
              {error}
            </Alert>
          )}
          {markdownHtml ? (
            <div className="min-h-0 overflow-y-auto pr-1">
              <div
                className="prose prose-slate max-w-none break-words dark:prose-invert"
                dangerouslySetInnerHTML={markdownMarkup}
              />
            </div>
          ) : (
            <p className={text.mutedSm}>{t('updateDialog.notesUnavailable')}</p>
          )}
        </div>
        <div className="flex justify-end gap-2 border-t border-slate-100 px-6 py-4 dark:border-slate-800">
          <Button variant="secondary" onClick={onCancel} disabled={busy} type="button">
            {t('updateDialog.later')}
          </Button>
          <Button variant="primary" onClick={onConfirm} disabled={busy} type="button">
            {busy ? t('updateDialog.updating') : t('updateDialog.updateNow')}
          </Button>
        </div>
      </div>
    </div>
  );
}
