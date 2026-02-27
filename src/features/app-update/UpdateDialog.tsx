import { useMemo } from 'react';
import { Calendar } from 'lucide-react';
import { renderMarkdown } from '../../utils/markdown';
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
  const markdownHtml = useMemo(() => (notes ? renderMarkdown(notes) : ''), [notes]);
  const markdownMarkup = useMemo(() => ({ __html: markdownHtml }), [markdownHtml]);
  if (!open) return null;

  const handleBackdrop = () => {
    if (busy) return;
    onCancel();
  };

  return (
    <div className={layout.fixedCenter}>
      <button type="button" aria-label="閉じる" className={overlay.backdrop} onClick={handleBackdrop} />
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
            <span className="text-xs font-semibold uppercase tracking-widest text-blue-500">アップデート</span>
            <h3 className={text.titleLg} id="update-title">
              新しいバージョンが利用可能です
            </h3>
            {publishedOn && (
              <p className={cn(layout.inlineGap2, 'mt-1', text.mutedXs)}>
                <Calendar size={14} />
                <span>公開日 {publishedOn}</span>
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
            <p className={text.mutedSm}>更新内容の詳細は取得できませんでした。</p>
          )}
        </div>
        <div className="flex justify-end gap-2 border-t border-slate-100 px-6 py-4 dark:border-slate-800">
          <Button variant="secondary" onClick={onCancel} disabled={busy} type="button">
            後で
          </Button>
          <Button variant="primary" onClick={onConfirm} disabled={busy} type="button">
            {busy ? '更新中…' : '今すぐ更新'}
          </Button>
        </div>
      </div>
    </div>
  );
}
