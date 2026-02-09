/**
 * 送信バーコンポーネント
 */
import React from 'react';
import { BookOpen, Send } from 'lucide-react';
import type { RegisterSubmitBarProps } from '../types';

export default function RegisterSubmitBar({
  packageGuideUrl,
  packageSender,
  submitting,
  pendingSubmitCount,
  submittingLabel,
  onPackageSenderChange,
  onOpenJsonImport,
}: RegisterSubmitBarProps) {
  const submitButtonLabel = submitting
    ? submittingLabel || '送信中…'
    : pendingSubmitCount <= 1
      ? '送信する'
      : `${pendingSubmitCount}件まとめて送信`;

  return (
    <section className="sticky bottom-6 z-20 mb-6 rounded-2xl border border-slate-200 bg-white/90 p-4 shadow-xl backdrop-blur-md dark:border-slate-800 dark:bg-slate-900/90">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          {packageGuideUrl && (
            <a
              className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
              href={packageGuideUrl}
              target="_blank"
              rel="noreferrer noopener"
            >
              <BookOpen size={16} />
              説明サイト
            </a>
          )}
          <button
            type="button"
            className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
            onClick={onOpenJsonImport}
          >
            JSON入力
          </button>
        </div>
        <div className="flex items-center gap-3">
          <div className="hidden sm:flex items-center gap-3">
            <span className="border-r border-slate-200 pr-3 text-[11px] text-slate-500 dark:border-slate-700 dark:text-slate-400">
              作者の方はできる限りご入力ください
            </span>
            <input
              type="text"
              value={packageSender}
              onChange={(e) => onPackageSenderChange(e.target.value)}
              placeholder="送信者のニックネーム"
              className="min-w-[240px]"
              aria-label="送信者のニックネーム"
            />
          </div>
          <button
            type="submit"
            className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-6 py-2.5 text-sm font-bold text-white shadow-md transition hover:bg-blue-700 hover:shadow-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 disabled:cursor-not-allowed disabled:opacity-60 dark:hover:bg-blue-500"
            disabled={submitting || pendingSubmitCount <= 0}
          >
            {submitting ? (
              <>
                <span className="spinner" />
                {submitButtonLabel}
              </>
            ) : (
              <>
                <Send size={18} />
                {submitButtonLabel}
              </>
            )}
          </button>
        </div>
      </div>
    </section>
  );
}
