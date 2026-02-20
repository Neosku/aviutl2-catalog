import { useEffect, useRef, useState } from 'react';
import { AlertTriangle, Copy, Check } from 'lucide-react';
import { logError } from '../utils/index.js';

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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <button type="button" aria-label="閉じる" className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div
        className="relative w-full max-w-lg rounded-2xl border border-slate-200 bg-white shadow-xl dark:border-slate-800 dark:bg-slate-900"
        role="dialog"
        aria-modal="true"
        aria-labelledby="error-title"
        aria-describedby="error-message"
      >
        <div className="flex items-start gap-3 border-b border-slate-100 px-6 py-4 dark:border-slate-800">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-red-50 text-red-600 dark:bg-red-900/30 dark:text-red-300">
            <AlertTriangle size={20} />
          </div>
          <div className="flex-1">
            <p className="text-xs uppercase tracking-widest text-red-500">Error</p>
            <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100" id="error-title">
              {title}
            </h3>
          </div>
          <button
            className="rounded-lg border border-slate-200 p-2 text-slate-500 transition hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
            onClick={onCopy}
            aria-label={copied ? 'コピーしました' : 'エラーメッセージをコピー'}
            title={copied ? 'コピーしました' : 'エラーメッセージをコピー'}
            type="button"
          >
            {copied ? <Check size={16} /> : <Copy size={16} />}
          </button>
        </div>
        <div className="px-6 py-4">
          <pre
            id="error-message"
            className="max-h-64 overflow-auto rounded-xl border border-slate-200 bg-slate-50 p-4 text-xs text-slate-700 dark:border-slate-800 dark:bg-slate-800/50 dark:text-slate-200"
            aria-live="polite"
          >
            <code>{message}</code>
          </pre>
        </div>
        <div className="flex justify-end border-t border-slate-100 px-6 py-4 dark:border-slate-800">
          <button className="btn btn--primary" onClick={onClose} type="button">
            閉じる
          </button>
        </div>
      </div>
    </div>
  );
}
