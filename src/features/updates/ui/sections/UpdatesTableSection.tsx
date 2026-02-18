import ProgressCircle from '../../../../components/ProgressCircle.jsx';
import { latestVersionOf } from '../../../../utils/index.js';
import type { UpdatesTableSectionProps } from '../types';

export default function UpdatesTableSection({
  updatableItems,
  itemProgress,
  bulkUpdating,
  onUpdate,
}: UpdatesTableSectionProps) {
  return (
    <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
      {updatableItems.length === 0 ? (
        <div className="p-8 text-center text-slate-500 dark:text-slate-400">
          <p>すべて最新の状態です</p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <div className="min-w-[760px]">
            <div className="px-4 py-3 border-b border-slate-200 dark:border-slate-800 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide grid grid-cols-[minmax(0,2.5fr)_minmax(0,1fr)_minmax(0,1.5fr)_minmax(0,1fr)_minmax(0,1fr)_7.5rem] gap-2">
              <span>パッケージ</span>
              <span>作者</span>
              <span>種類</span>
              <span>更新前</span>
              <span>更新後</span>
              <span className="text-right"></span>
            </div>
            <div className="divide-y divide-slate-100 dark:divide-slate-800">
              {updatableItems.map((item) => {
                const progress = itemProgress[item.id];
                return (
                  <div
                    key={item.id}
                    className="px-4 py-4 grid grid-cols-[minmax(0,2.5fr)_minmax(0,1fr)_minmax(0,1.5fr)_minmax(0,1fr)_minmax(0,1fr)_7.5rem] gap-2 items-center hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors"
                  >
                    <div className="min-w-0">
                      <div className="font-semibold text-sm text-slate-800 dark:text-slate-100 truncate">
                        {item.name}
                      </div>
                      <div className="text-xs text-slate-500 dark:text-slate-400 truncate">{item.id}</div>
                    </div>
                    <div className="text-sm text-slate-600 dark:text-slate-300 truncate">{item.author || '?'}</div>
                    <div className="text-sm text-slate-600 dark:text-slate-300 truncate">{item.type || '?'}</div>
                    <div className="text-sm text-slate-600 dark:text-slate-300">{item.installedVersion || '?'}</div>
                    <div className="text-sm font-semibold text-green-600 dark:text-green-400">
                      {latestVersionOf(item) || ''}
                    </div>
                    <div className="text-right">
                      {progress ? (
                        <div className="flex items-center justify-end gap-2">
                          <span className="text-xs text-slate-500 dark:text-slate-400">{progress.label}</span>
                          <ProgressCircle
                            value={progress.ratio}
                            size={24}
                            strokeWidth={3}
                            ariaLabel={`${item.name} の更新進捗`}
                          />
                        </div>
                      ) : (
                        <button
                          className="px-3 py-1.5 bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 rounded text-xs hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors cursor-pointer disabled:cursor-not-allowed"
                          onClick={() => onUpdate(item)}
                          disabled={bulkUpdating}
                          type="button"
                        >
                          更新
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
