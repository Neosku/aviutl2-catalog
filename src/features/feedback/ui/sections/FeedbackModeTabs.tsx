import React from 'react';
import { Bug, MessageSquare } from 'lucide-react';
import type { FeedbackModeTabsProps } from '../types';

export default function FeedbackModeTabs({ mode, onModeChange }: FeedbackModeTabsProps) {
  return (
    <div className="m-4 flex w-fit gap-1 rounded-lg border border-slate-200/50 bg-slate-50 p-1 dark:border-slate-800/50 dark:bg-slate-900/50">
      <button
        type="button"
        onClick={() => onModeChange('bug')}
        className={`flex cursor-pointer items-center gap-2 rounded-md px-4 py-2 text-sm font-medium transition-all ${
          mode === 'bug'
            ? 'bg-white text-blue-600 shadow-sm dark:bg-slate-800 dark:text-blue-400'
            : 'text-slate-600 hover:bg-slate-200/50 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800/50 dark:hover:text-slate-200'
        }`}
      >
        <Bug size={16} />
        不具合報告
      </button>
      <button
        type="button"
        onClick={() => onModeChange('inquiry')}
        className={`flex cursor-pointer items-center gap-2 rounded-md px-4 py-2 text-sm font-medium transition-all ${
          mode === 'inquiry'
            ? 'bg-white text-blue-600 shadow-sm dark:bg-slate-800 dark:text-blue-400'
            : 'text-slate-600 hover:bg-slate-200/50 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800/50 dark:hover:text-slate-200'
        }`}
      >
        <MessageSquare size={16} />
        意見・問い合わせ
      </button>
    </div>
  );
}
