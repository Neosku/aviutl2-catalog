import { useEffect, useRef, useState } from 'react';
import { AlertTriangle, Copy, Check } from 'lucide-react';
import { logError } from '../utils/logging';
import Button from '@/components/ui/Button';
import { layout, overlay, surface, text } from '@/components/ui/_styles';
import { cn } from '@/lib/cn';

interface ErrorDialogProps {
  open: boolean;
  title?: string;
  message?: string;
  onClose: () => void;
}

const COPIED_RESET_MS = 2000;

function toErrorText(error: unknown): string {
  if (error instanceof Error && error.message) return error.message;
  return String(error ?? 'unknown');
}

export default function ErrorDialog({ open, title = 'エラーが発生しました', message = '', onClose }: ErrorDialogProps) {
  const [copied, setCopied] = useState(false);
  const copiedTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (open) setCopied(false);
    return () => {
      if (copiedTimerRef.current) {
        clearTimeout(copiedTimerRef.current);
        copiedTimerRef.current = null;
      }
    };
  }, [open]);

  if (!open) return null;

  async function onCopy() {
    try {
      await navigator.clipboard.writeText(message);
      setCopied(true);
      if (copiedTimerRef.current) clearTimeout(copiedTimerRef.current);
      copiedTimerRef.current = setTimeout(() => {
        setCopied(false);
        copiedTimerRef.current = null;
      }, COPIED_RESET_MS);
    } catch (error) {
      void logError(`[error-dialog] clipboard copy failed: ${toErrorText(error)}`).catch(() => {});
    }
  }

  return (
    <div className={layout.fixedCenter}>
      <button type="button" aria-label="閉じる" className={overlay.backdrop} onClick={onClose} />
      <div
        className={cn(surface.card, layout.modalWidthLg, 'shadow-xl')}
        role="dialog"
        aria-modal="true"
        aria-labelledby="error-title"
        aria-describedby="error-message"
      >
        <div className={cn(surface.sectionDivider, layout.inlineStartGap3)}>
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-red-50 text-red-600 dark:bg-red-900/30 dark:text-red-300">
            <AlertTriangle size={20} />
          </div>
          <div className="flex-1">
            <p className="text-xs uppercase tracking-widest text-red-500">Error</p>
            <h3 className={text.titleLg} id="error-title">
              {title}
            </h3>
          </div>
          <Button
            variant="iconSubtle"
            size="icon"
            onClick={onCopy}
            aria-label={copied ? 'コピーしました' : 'エラーメッセージをコピー'}
            title={copied ? 'コピーしました' : 'エラーメッセージをコピー'}
            type="button"
          >
            {copied ? <Check size={16} /> : <Copy size={16} />}
          </Button>
        </div>
        <div className="px-6 py-4">
          <pre
            id="error-message"
            className={cn(surface.panelSubtle, text.bodyXsStrong, 'max-h-64 overflow-auto p-4')}
            aria-live="polite"
          >
            <code>{message}</code>
          </pre>
        </div>
        <div className={layout.footerEnd}>
          <Button variant="primary" size="default" onClick={onClose} type="button">
            閉じる
          </Button>
        </div>
      </div>
    </div>
  );
}
