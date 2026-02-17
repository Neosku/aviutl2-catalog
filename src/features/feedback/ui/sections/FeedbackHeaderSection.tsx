import React from 'react';
import { ExternalLink } from 'lucide-react';

export default function FeedbackHeaderSection() {
  return (
    <div className="flex flex-col justify-between gap-4 md:flex-row md:items-start">
      <div>
        <h2 className="mb-2 text-2xl font-bold text-slate-900 dark:text-white">フィードバック</h2>
        <p className="text-sm text-slate-500 dark:text-slate-400">不具合のご報告やご意見をお寄せください</p>
      </div>
      <a
        href="https://github.com/Neosku/aviutl2-catalog/issues"
        target="_blank"
        rel="noreferrer noopener"
        className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 shadow-sm transition hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800"
      >
        <ExternalLink size={16} />
        報告済みの不具合
      </a>
    </div>
  );
}
