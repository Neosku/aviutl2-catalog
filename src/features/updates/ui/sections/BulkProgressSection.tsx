import type { BulkProgressSectionProps } from '../types';

export default function BulkProgressSection({ bulkProgress, bulkPercent, progressStyle }: BulkProgressSectionProps) {
  return (
    <div className="mb-6 p-5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-sm">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-6">
          <div className="flex items-baseline gap-1">
            <span className="text-4xl font-bold text-blue-600 dark:text-blue-500 font-mono tracking-tight">
              {bulkProgress.current}
            </span>
            <span className="text-xl font-medium text-slate-300 dark:text-slate-700">/</span>
            <span className="text-xl font-medium text-slate-400 dark:text-slate-500">{bulkProgress.total}</span>
          </div>
          <div className="min-w-0">
            <div className="text-base font-bold text-slate-800 dark:text-slate-100 truncate">
              {bulkProgress.itemName}
            </div>
            <div className="flex items-center gap-2 mt-0.5">
              <div className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse" />
              <span className="text-xs font-medium text-slate-500 dark:text-slate-400">{bulkProgress.status}</span>
            </div>
          </div>
        </div>
        <div className="shrink-0 text-right">
          <span className="text-lg font-bold text-blue-600 dark:text-blue-500 font-mono">{bulkPercent}%</span>
        </div>
      </div>
      <div className="h-2 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
        <div
          className={`h-full bg-blue-600 dark:bg-blue-500 ${bulkPercent > 0 ? 'transition-all duration-300 ease-out' : ''}`}
          style={progressStyle}
        />
      </div>
    </div>
  );
}
