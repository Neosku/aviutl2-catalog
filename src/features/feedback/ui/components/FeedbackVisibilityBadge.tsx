import React from 'react';
import type { FeedbackVisibilityBadgeProps } from '../types';

export default function FeedbackVisibilityBadge({ type = 'public', label }: FeedbackVisibilityBadgeProps) {
  const text = label || (type === 'public' ? '公開' : '非公開');
  const tone =
    type === 'public'
      ? 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900/40 dark:bg-emerald-900/20 dark:text-emerald-300'
      : 'border-slate-200 bg-slate-100 text-slate-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-400';
  return (
    <span
      className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wide ${tone}`}
    >
      {text}
    </span>
  );
}
