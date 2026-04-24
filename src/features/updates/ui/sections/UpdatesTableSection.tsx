import ProgressCircle from '@/components/ProgressCircle';
import PackageNameLink from '@/components/PackageNameLink';
import { useTranslation } from 'react-i18next';
import { resolvePackageTypeLabel } from '@/features/package/model/helpers';
import { getInstalledVersionLabel } from '@/utils/detectResult';
import type { UpdatesTableSectionProps } from '../types';
import { surface, table, text } from '@/components/ui/_styles';
import { cn } from '@/lib/cn';

const cellTruncateClass = table.cellBodyTruncate;

export default function UpdatesTableSection({
  items,
  emptyMessage,
  itemProgress,
  bulkUpdating,
  pausedPackageIds,
  pauseBusyIds,
  onUpdate,
  onTogglePause,
}: UpdatesTableSectionProps) {
  const { t } = useTranslation(['updates', 'package', 'common']);

  return (
    <div className={surface.panel}>
      {items.length === 0 ? (
        <div className={text.emptyStateMuted}>
          <p>{emptyMessage}</p>
        </div>
      ) : (
        <div className={table.scrollX}>
          <div className="min-w-[760px]">
            <div
              className={cn(
                table.headerBase,
                'grid-cols-[minmax(0,2.5fr)_minmax(0,1fr)_minmax(0,1.5fr)_minmax(0,1fr)_minmax(0,1fr)_8rem]',
              )}
            >
              <span>{t('table.package')}</span>
              <span>{t('common:labels.author')}</span>
              <span>{t('common:labels.type')}</span>
              <span>{t('table.before')}</span>
              <span>{t('table.after')}</span>
              <span className="text-right"></span>
            </div>
            <div className={surface.divideMuted}>
              {items.map((item) => {
                const progress = itemProgress[item.id];
                const paused = pausedPackageIds.has(item.id);
                const pauseBusy = pauseBusyIds.has(item.id);
                const packageTypeLabel = resolvePackageTypeLabel(item.packageType, t, '?', item.typeLabel);
                const installedVersionLabel =
                  getInstalledVersionLabel(
                    item.installedVersion,
                    item.detectedResult,
                    t('package:sidebar.versionUnknown'),
                  ) || '?';
                return (
                  <div
                    key={item.id}
                    className={cn(
                      table.rowBase,
                      table.rowRelaxed,
                      'grid-cols-[minmax(0,2.5fr)_minmax(0,1fr)_minmax(0,1.5fr)_minmax(0,1fr)_minmax(0,1fr)_8rem] transition-none hover:bg-transparent dark:hover:bg-transparent',
                    )}
                  >
                    <div className="min-w-0">
                      <PackageNameLink id={item.id} name={item.name} source="updates" />
                    </div>
                    <div className={cellTruncateClass}>{item.author || '?'}</div>
                    <div className={cellTruncateClass}>{packageTypeLabel}</div>
                    <div className={text.bodySmMutedAlt}>{installedVersionLabel}</div>
                    <div className="text-sm font-semibold text-green-600 dark:text-green-400">
                      {item.latestVersion || ''}
                    </div>
                    <div className="text-right">
                      {progress ? (
                        <div className="flex items-center justify-end gap-2">
                          <span className={text.mutedXs}>{progress.label}</span>
                          <ProgressCircle
                            value={progress.ratio}
                            size={24}
                            strokeWidth={3}
                            ariaLabel={t('table.progressAria', { name: item.name })}
                          />
                        </div>
                      ) : (
                        <div className="flex items-center justify-end gap-2">
                          {paused ? (
                            <button
                              className={table.actionButtonSubtle}
                              onClick={() => onTogglePause(item, false)}
                              disabled={bulkUpdating || pauseBusy}
                              type="button"
                            >
                              {pauseBusy ? t('table.saving') : t('table.resume')}
                            </button>
                          ) : (
                            <>
                              <button
                                className={table.actionButtonSubtle}
                                onClick={() => onTogglePause(item, true)}
                                disabled={bulkUpdating || pauseBusy}
                                type="button"
                              >
                                {pauseBusy ? t('table.saving') : t('table.pause')}
                              </button>
                              <button
                                className={table.actionButtonSubtle}
                                onClick={() => onUpdate(item)}
                                disabled={bulkUpdating || pauseBusy}
                                type="button"
                              >
                                {t('table.update')}
                              </button>
                            </>
                          )}
                        </div>
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
