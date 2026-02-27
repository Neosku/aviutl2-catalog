import ProgressCircle from '../../../../components/ProgressCircle';
import { latestVersionOf } from '../../../../utils/catalog';
import type { UpdatesTableSectionProps } from '../types';
import { surface, table, text } from '@/components/ui/_styles';
import { cn } from '@/lib/cn';

const cellTruncateClass = table.cellBodyTruncate;

export default function UpdatesTableSection({
  updatableItems,
  itemProgress,
  bulkUpdating,
  onUpdate,
}: UpdatesTableSectionProps) {
  return (
    <div className={surface.panel}>
      {updatableItems.length === 0 ? (
        <div className={text.emptyStateMuted}>
          <p>すべて最新の状態です</p>
        </div>
      ) : (
        <div className={table.scrollX}>
          <div className="min-w-[760px]">
            <div
              className={cn(
                table.headerBase,
                'grid-cols-[minmax(0,2.5fr)_minmax(0,1fr)_minmax(0,1.5fr)_minmax(0,1fr)_minmax(0,1fr)_7.5rem]',
              )}
            >
              <span>パッケージ</span>
              <span>作者</span>
              <span>種類</span>
              <span>更新前</span>
              <span>更新後</span>
              <span className="text-right"></span>
            </div>
            <div className={surface.divideMuted}>
              {updatableItems.map((item) => {
                const progress = itemProgress[item.id];
                return (
                  <div
                    key={item.id}
                    className={cn(
                      table.rowBase,
                      table.rowRelaxed,
                      'grid-cols-[minmax(0,2.5fr)_minmax(0,1fr)_minmax(0,1.5fr)_minmax(0,1fr)_minmax(0,1fr)_7.5rem]',
                    )}
                  >
                    <div className="min-w-0">
                      <div className={text.titleSmTruncate}>{item.name}</div>
                      <div className={text.mutedXsTruncate}>{item.id}</div>
                    </div>
                    <div className={cellTruncateClass}>{item.author || '?'}</div>
                    <div className={cellTruncateClass}>{item.type || '?'}</div>
                    <div className={text.bodySmMutedAlt}>{item.installedVersion || '?'}</div>
                    <div className="text-sm font-semibold text-green-600 dark:text-green-400">
                      {latestVersionOf(item) || ''}
                    </div>
                    <div className="text-right">
                      {progress ? (
                        <div className="flex items-center justify-end gap-2">
                          <span className={text.mutedXs}>{progress.label}</span>
                          <ProgressCircle
                            value={progress.ratio}
                            size={24}
                            strokeWidth={3}
                            ariaLabel={`${item.name} の更新進捗`}
                          />
                        </div>
                      ) : (
                        <button
                          className={table.actionButtonSubtle}
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
