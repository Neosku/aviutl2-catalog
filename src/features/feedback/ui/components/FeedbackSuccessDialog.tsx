import React from 'react';
import { createPortal } from 'react-dom';
import { CheckCircle2, ExternalLink } from 'lucide-react';
import type { FeedbackSuccessDialogProps } from '../types';

export default function FeedbackSuccessDialog({ dialog, primaryText, onClose }: FeedbackSuccessDialogProps) {
  if (!dialog.open) return null;
  return createPortal(
    <div
      className="fixed top-8 inset-x-0 bottom-0 z-50 flex items-center justify-center p-4"
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
      <div className="relative w-full max-w-lg overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl animate-in zoom-in-95 duration-200 dark:border-slate-800 dark:bg-slate-900">
        <div className="flex items-center gap-3 border-b border-slate-100 bg-slate-50/50 px-6 py-4 dark:border-slate-800 dark:bg-slate-900/50">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400">
            <CheckCircle2 size={18} />
          </div>
          <h3 id="submit-success-title" className="text-lg font-bold text-slate-800 dark:text-slate-100">
            送信完了
          </h3>
        </div>

        <div className="px-6 py-8">
          <p className="select-text font-medium text-slate-700 dark:text-slate-200">{primaryText}</p>
        </div>

        <div className="flex flex-wrap items-center justify-end gap-3 border-t border-slate-100 bg-slate-50/50 px-6 py-4 dark:border-slate-800 dark:bg-slate-900/50">
          {dialog.url ? (
            <a
              className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
              href={dialog.url}
              target="_blank"
              rel="noreferrer noopener"
            >
              <ExternalLink size={16} />
              公開ページを開く
            </a>
          ) : null}
          <button
            type="button"
            className="inline-flex cursor-pointer items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-blue-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 dark:hover:bg-blue-500"
            onClick={onClose}
          >
            閉じる
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
