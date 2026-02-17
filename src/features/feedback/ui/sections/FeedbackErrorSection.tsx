import React from 'react';
import { AlertCircle } from 'lucide-react';
import type { FeedbackErrorSectionProps } from '../types';

export default function FeedbackErrorSection({ message }: FeedbackErrorSectionProps) {
  if (!message) return null;
  return (
    <div
      className="flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900/40 dark:bg-red-900/20 dark:text-red-200 select-text"
      role="alert"
    >
      <AlertCircle size={18} className="mt-0.5 shrink-0" />
      <span className="whitespace-pre-wrap">{message}</span>
    </div>
  );
}
