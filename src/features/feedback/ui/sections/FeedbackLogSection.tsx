import React from 'react';
import { FileText } from 'lucide-react';
import { BUG_FIELDS } from '../../model/fieldNames';
import FeedbackToggleSwitch from '../components/FeedbackToggleSwitch';
import type { FeedbackLogSectionProps } from '../types';

export default function FeedbackLogSection({ loading, includeLog, appLog, onBugChange }: FeedbackLogSectionProps) {
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 text-sm font-semibold text-slate-800 dark:text-slate-200">
        <FileText size={16} className="text-slate-500" />
        ログファイル
      </div>
      {loading ? (
        <div className="animate-pulse text-xs text-slate-500">情報を収集中...</div>
      ) : (
        <div className="rounded-lg border border-slate-200 bg-slate-50/50 p-3 dark:border-slate-800 dark:bg-slate-800/20">
          <div className="flex items-center gap-3">
            <FeedbackToggleSwitch
              id="feedback-include-log"
              name={BUG_FIELDS.includeLog}
              checked={includeLog}
              onChange={onBugChange}
            />
            <label
              htmlFor="feedback-include-log"
              className="cursor-pointer text-sm font-medium text-slate-700 dark:text-slate-300"
            >
              app.log を添付
            </label>
          </div>
          {includeLog ? (
            <div className="mt-3">
              {appLog ? (
                <pre className="max-h-55 overflow-auto rounded-md bg-slate-100 p-2 font-mono text-[10px] text-slate-600 dark:bg-slate-900 dark:text-slate-400 scrollbar-thin scrollbar-thumb-slate-300 dark:scrollbar-thumb-slate-600 select-text">
                  {appLog}
                </pre>
              ) : (
                <div className="mt-1 text-xs italic text-slate-400">ログを取得できませんでした。</div>
              )}
            </div>
          ) : null}
        </div>
      )}
    </div>
  );
}
