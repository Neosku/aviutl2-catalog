/**
 * 送信完了ダイアログコンポーネント
 */
import React from 'react';
import { Check, ExternalLink } from 'lucide-react';
import type { RegisterSuccessDialogProps } from '../types';

export default function RegisterSuccessDialog({
  dialog,
  primaryText,
  supportText,
  onClose,
}: RegisterSuccessDialogProps) {
  if (!dialog.open) return null;
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="submit-success-title"
    >
      <button
        type="button"
        aria-label="閉じる"
        className="absolute inset-0 bg-black/50 transition-opacity"
        onClick={onClose}
      />
      <div className="relative w-full max-w-lg transform overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl transition-all dark:border-slate-800 dark:bg-slate-900">
        <div className="border-b border-slate-100 bg-slate-50/50 px-6 py-4 dark:border-slate-800 dark:bg-slate-900/50">
          <h3 id="submit-success-title" className="text-lg font-bold text-slate-800 dark:text-slate-100">
            送信が完了しました
          </h3>
        </div>
        <div className="px-6 py-6">
          <div className="flex items-start gap-4">
            <div
              className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400"
              aria-hidden
            >
              <Check size={24} />
            </div>
            <div className="space-y-1">
              <p className="font-semibold text-slate-800 dark:text-slate-100">{primaryText}</p>
              {supportText && <p className="text-sm text-slate-500 dark:text-slate-400">{supportText}</p>}
            </div>
          </div>
        </div>
        <div className="flex flex-wrap items-center justify-end gap-3 border-t border-slate-100 bg-slate-50/50 px-6 py-4 dark:border-slate-800 dark:bg-slate-900/50">
          {dialog.url && (
            <a
              className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
              href={dialog.url}
              target="_blank"
              rel="noreferrer noopener"
            >
              <ExternalLink size={16} />
              公開ページを開く
            </a>
          )}
          <button
            type="button"
            className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 dark:hover:bg-blue-500"
            onClick={onClose}
          >
            閉じる
          </button>
        </div>
      </div>
    </div>
  );
}
