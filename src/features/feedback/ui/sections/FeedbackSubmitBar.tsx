import React from 'react';
import type { FeedbackSubmitBarProps } from '../types';

export default function FeedbackSubmitBar({ submitting }: FeedbackSubmitBarProps) {
  return (
    <div className="flex justify-end pt-4">
      <button
        type="submit"
        className="inline-flex cursor-pointer items-center gap-2 rounded-lg bg-blue-600 px-6 py-2.5 text-sm font-medium text-white shadow-md transition-all hover:bg-blue-700 hover:shadow-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:shadow-md dark:focus-visible:ring-offset-slate-900"
        disabled={submitting}
      >
        {submitting ? (
          <>
            <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
            送信中...
          </>
        ) : (
          <>送信する</>
        )}
      </button>
    </div>
  );
}
