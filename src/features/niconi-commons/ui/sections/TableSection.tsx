import Checkbox from '../../../../components/ui/Checkbox';
import type { TableSectionProps } from '../types';
import { layout, state, surface, table, text } from '@/components/ui/_styles';
import { cn } from '@/lib/cn';

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
    <div className={surface.panel}>
      {visibleCount === 0 ? (
        <div className={text.emptyStateMuted}>
          {totalEligible === 0 ? '対象となるパッケージがありません' : '該当なし'}
        </div>
      ) : (
        <div className={table.scrollX}>
          <div className="min-w-[720px]">
            <div className={cn(table.headerBase, 'grid-cols-[2.5rem_minmax(0,2fr)_minmax(0,1.2fr)_minmax(0,1fr)]')}>
              <div className={layout.center}>
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
            <div className={surface.divideMuted}>
              {filteredItems.map((item) => (
                <div
                  key={item.id}
                  className={cn(
                    table.rowBase,
                    table.rowCompact,
                    'grid-cols-[2.5rem_minmax(0,2fr)_minmax(0,1.2fr)_minmax(0,1fr)] cursor-pointer',
                  )}
                  tabIndex={0}
                  onClick={() => onToggleItem(item.id)}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter' || event.key === ' ') {
                      event.preventDefault();
                      onToggleItem(item.id);
                    }
                  }}
                >
                  <div className={layout.center}>
                    <Checkbox
                      checked={Boolean(selectedMap[item.id])}
                      onChange={() => onToggleItem(item.id)}
                      ariaLabel={`${item.name || item.id} を選択`}
                    />
                  </div>
                  <div className="min-w-0">
                    <div className={text.titleSmTruncate}>{item.name || item.id}</div>
                  </div>
                  <div className={table.cellBodyTruncate}>{item.author}</div>
                  <div
                    className="text-sm font-mono text-slate-700 dark:text-slate-200 truncate"
                    title={item.niconiCommonsId}
                  >
                    <button
                      type="button"
                      className={cn(
                        state.focusRing,
                        'cursor-pointer truncate rounded-md px-2 py-1 text-left transition-colors hover:bg-blue-100 hover:text-blue-700 dark:hover:bg-blue-900/40 dark:hover:text-blue-200',
                      )}
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
