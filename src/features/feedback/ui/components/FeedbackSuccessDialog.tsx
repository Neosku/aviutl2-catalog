import { createPortal } from 'react-dom';
import { CheckCircle2, ExternalLink } from 'lucide-react';
import Button, { buttonVariants } from '@/components/ui/Button';
import type { FeedbackSuccessDialogProps } from '../types';
import { layout, surface, text } from '@/components/ui/_styles';
import { cn } from '@/lib/cn';

export default function FeedbackSuccessDialog({ dialog, primaryText, onClose }: FeedbackSuccessDialogProps) {
  if (!dialog.open) return null;
  return createPortal(
    <div
      className={cn(layout.center, 'fixed top-8 inset-x-0 bottom-0 z-50 p-4')}
      role="dialog"
      aria-modal="true"
      aria-labelledby="submit-success-title"
    >
      <button
        type="button"
        aria-label="閉じる"
        className="absolute inset-0 cursor-pointer bg-black/30 backdrop-blur-[2px]"
        onClick={onClose}
      />
      <div className={cn(surface.modal, layout.modalWidthLg, 'animate-in zoom-in-95 duration-200')}>
        <div className={cn(surface.modalHeaderMuted, 'flex items-center gap-3')}>
          <div
            className={cn(
              layout.center,
              'h-8 w-8 rounded-full bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400',
            )}
          >
            <CheckCircle2 size={18} />
          </div>
          <h3 id="submit-success-title" className={text.titleLg}>
            送信完了
          </h3>
        </div>

        <div className="px-6 py-8">
          <p className="select-text font-medium text-slate-700 dark:text-slate-200">{primaryText}</p>
        </div>

        <div className={layout.footerWrapEndMuted}>
          {dialog.url ? (
            <a
              className={cn(buttonVariants({ variant: 'secondary', size: 'actionSm' }), 'cursor-pointer')}
              href={dialog.url}
              target="_blank"
              rel="noreferrer noopener"
            >
              <ExternalLink size={16} />
              公開ページを開く
            </a>
          ) : null}
          <Button
            type="button"
            variant="primary"
            size="actionSm"
            className="cursor-pointer shadow-sm"
            onClick={onClose}
          >
            閉じる
          </Button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
