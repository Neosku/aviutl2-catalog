import React from 'react';
import Button from '@/components/ui/Button';
import { Bug, MessageSquare } from 'lucide-react';
import type { FeedbackModeTabsProps } from '../types';

export default function FeedbackModeTabs({ mode, onModeChange }: FeedbackModeTabsProps) {
  return (
    <div className="m-4 flex w-fit gap-1 rounded-lg border border-slate-200/50 bg-slate-50 p-1 dark:border-slate-800/50 dark:bg-slate-900/50">
      <Button
        type="button"
        onClick={() => onModeChange('bug')}
        variant={mode === 'bug' ? 'tabActive' : 'tab'}
        size="tab"
        className="cursor-pointer rounded-md"
      >
        <Bug size={16} />
        不具合報告
      </Button>
      <Button
        type="button"
        onClick={() => onModeChange('inquiry')}
        variant={mode === 'inquiry' ? 'tabActive' : 'tab'}
        size="tab"
        className="cursor-pointer rounded-md"
      >
        <MessageSquare size={16} />
        意見・問い合わせ
      </Button>
    </div>
  );
}
