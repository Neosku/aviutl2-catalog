import Checkbox from '../../../../components/ui/Checkbox.js';
import type { TableSectionProps } from '../types';

export default function TableSection({
  visibleCount,
  totalEligible,
  filteredItems,
  allVisibleSelected,
  selectedMap,
  onToggleAllVisible,
  onToggleItem,
  onCopyCommonsId,
}: TableSectionProps) {
  const selectedVisibleCount = filteredItems.reduce((count, item) => count + (selectedMap[item.id] ? 1 : 0), 0);
  const indeterminateVisibleSelection = selectedVisibleCount > 0 && selectedVisibleCount < visibleCount;

  return (
    <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
      {visibleCount === 0 ? (
        <div className="p-8 text-center text-slate-500 dark:text-slate-400">
          {totalEligible === 0 ? '対象となるパッケージがありません' : '該当なし'}
        </div>
      ) : (
        <div className="overflow-x-auto">
          <div className="min-w-[720px]">
            <div className="px-4 py-3 border-b border-slate-200 dark:border-slate-800 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide grid grid-cols-[2.5rem_minmax(0,2fr)_minmax(0,1.2fr)_minmax(0,1fr)] gap-2">
              <div className="flex items-center justify-center">
                <Checkbox
                  checked={allVisibleSelected}
                  indeterminate={indeterminateVisibleSelection}
                  onChange={onToggleAllVisible}
                  ariaLabel="表示中をすべて選択"
                />
              </div>
              <span>パッケージ名</span>
              <span>作者名</span>
              <span>ニコニ・コモンズID</span>
            </div>
            <div className="divide-y divide-slate-100 dark:divide-slate-800">
              {filteredItems.map((item) => (
                <div
                  key={item.id}
                  className="px-4 py-3 grid grid-cols-[2.5rem_minmax(0,2fr)_minmax(0,1.2fr)_minmax(0,1fr)] gap-2 items-center hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors cursor-pointer"
                  tabIndex={0}
                  onClick={() => onToggleItem(item.id)}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter' || event.key === ' ') {
                      event.preventDefault();
                      onToggleItem(item.id);
                    }
                  }}
                >
                  <div className="flex items-center justify-center">
                    <Checkbox
                      checked={Boolean(selectedMap[item.id])}
                      onChange={() => onToggleItem(item.id)}
                      ariaLabel={`${item.name || item.id} を選択`}
                    />
                  </div>
                  <div className="min-w-0">
                    <div className="font-semibold text-sm text-slate-800 dark:text-slate-100 truncate">
                      {item.name || item.id}
                    </div>
                    <div className="text-xs text-slate-500 dark:text-slate-400 truncate">{item.id}</div>
                  </div>
                  <div className="min-w-0 text-sm text-slate-600 dark:text-slate-300 truncate">{item.author}</div>
                  <div
                    className="text-sm font-mono text-slate-700 dark:text-slate-200 truncate"
                    title={item.niconiCommonsId}
                  >
                    <button
                      type="button"
                      className="cursor-pointer truncate rounded-md px-2 py-1 text-left transition-colors hover:bg-blue-100 hover:text-blue-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 dark:hover:bg-blue-900/40 dark:hover:text-blue-200"
                      onClick={(event) => {
                        event.stopPropagation();
                        onCopyCommonsId(item.niconiCommonsId);
                      }}
                    >
                      {item.niconiCommonsId}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
