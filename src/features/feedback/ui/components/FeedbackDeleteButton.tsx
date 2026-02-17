import React, { memo } from 'react';
import { Trash2 } from 'lucide-react';
import type { FeedbackDeleteButtonProps } from '../types';

const FeedbackDeleteButton = memo(function FeedbackDeleteButton({
  onClick,
  ariaLabel = '削除',
  title,
}: FeedbackDeleteButtonProps) {
  return (
    <button
      type="button"
      className="inline-flex h-8 w-8 cursor-pointer items-center justify-center rounded-lg border border-slate-200 text-slate-500 transition hover:bg-slate-50 hover:text-slate-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 dark:border-slate-700 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-200"
      aria-label={ariaLabel}
      title={title || ariaLabel}
      onClick={onClick}
    >
      <Trash2 size={16} />
    </button>
  );
});

export default FeedbackDeleteButton;
