import { useEffect, useMemo, useRef, useState } from 'react';
import { History, Trash2 } from 'lucide-react';
import DeprecatedPackageChip from '@/components/DeprecatedPackageChip';
import ProgressCircle from '@/components/ProgressCircle';
import PackageNameLink from '@/components/PackageNameLink';
import { useTranslation } from 'react-i18next';
import { resolvePackageTypeLabel } from '@/features/package/model/helpers';
import { getInstalledVersionLabel } from '@/utils/detectResult';
import type { RenderedChangelogSection } from '../../model/changelog';
import type { UpdatesTableSectionProps } from '../types';
import { surface, table, text } from '@/components/ui/_styles';
import { cn } from '@/lib/cn';

const cellTruncateClass = table.cellBodyTruncate;
const updatesTableMinWidthClass = 'min-w-[800px]';
const updatesTableGridClass =
  'grid-cols-[2.25rem_minmax(0,2.5fr)_minmax(0,1fr)_minmax(0,1.5fr)_minmax(0,1fr)_minmax(0,1fr)_8rem]';
const changelogBodyClass = cn(
  'prose prose-slate prose-sm max-w-none dark:prose-invert',
  'prose-headings:text-slate-800 dark:prose-headings:text-slate-100',
  'prose-headings:mt-3 prose-headings:mb-1 first:prose-headings:mt-0',
  'prose-p:text-sm prose-p:text-slate-600 dark:prose-p:text-slate-300 prose-p:my-0.5',
  'prose-strong:font-semibold prose-strong:text-slate-700 dark:prose-strong:text-slate-200',
  'prose-li:text-sm prose-li:text-slate-600 dark:prose-li:text-sm dark:prose-li:text-slate-300 prose-li:my-0',
  'prose-ul:my-1 prose-ol:my-1',
);
const changelogPanelClass =
  'border-t border-slate-200/80 bg-slate-100/50 pb-4 pl-16 pr-12 pt-3 shadow-[inset_0_1px_4px_0_rgba(0,0,0,0.05)] dark:border-slate-800/80 dark:bg-slate-950/40 dark:shadow-[inset_0_1px_5px_0_rgba(0,0,0,0.4)]';
const changelogToggleButtonClass = 'flex h-7 w-7 shrink-0 items-center justify-center rounded-md transition-all';
const changelogToggleActiveClass = 'text-blue-600 bg-blue-50 dark:text-blue-400 dark:bg-blue-900/30';
const changelogToggleInactiveClass =
  'text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:text-slate-500 dark:hover:bg-slate-800 dark:hover:text-slate-300';
const removeActionButtonClass =
  'inline-flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 transition-colors hover:bg-red-50 hover:text-red-500 disabled:cursor-not-allowed disabled:opacity-60 dark:hover:bg-red-900/20';

function UpdatesChangelogBody({ html }: { html: string }) {
  const markup = useMemo(() => ({ __html: html }), [html]);
  return <div className={changelogBodyClass} dangerouslySetInnerHTML={markup} />;
}

function UpdatesChangelogSection({ section }: { section: RenderedChangelogSection }) {
  return (
    <div className="relative mb-6 last:mb-0">
      {section.version ? (
        <div className="not-prose -mx-4 mb-2 flex items-center justify-between border-b border-slate-100 px-1 pb-1.5 dark:border-slate-800">
          <span className="rounded-full border border-blue-100 bg-blue-50/80 px-2 py-0.5 text-[11px] font-bold text-blue-700 dark:border-blue-800/50 dark:bg-blue-900/30 dark:text-blue-300">
            {section.version}
          </span>
          {section.date ? (
            <span className="inline-flex items-center rounded-full border border-slate-200/60 bg-slate-50 px-2 py-0.5 text-[10px] font-medium text-slate-500 dark:border-slate-700/60 dark:bg-slate-800 dark:text-slate-400">
              {section.date}
            </span>
          ) : null}
        </div>
      ) : null}
      <UpdatesChangelogBody html={section.html} />
    </div>
  );
}

export default function UpdatesTableSection({
  items,
  emptyMessage,
  itemProgress,
  bulkUpdating,
  pausedPackageIds,
  pauseBusyIds,
  changelogEntries,
  onUpdate,
  onTogglePause,
  onRemove,
}: UpdatesTableSectionProps) {
  const { t } = useTranslation(['updates', 'package', 'common']);
  const [expandedIds, setExpandedIds] = useState<Set<string>>(() => new Set(items.map((item) => item.id)));
  const manuallyChangedIdsRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    setExpandedIds((prev) => {
      const currentIds = new Set(items.map((item) => item.id));
      manuallyChangedIdsRef.current.forEach((id) => {
        if (!currentIds.has(id)) {
          manuallyChangedIdsRef.current.delete(id);
        }
      });

      const next = new Set<string>();
      items.forEach((item) => {
        const changelog = changelogEntries[item.id];
        if (changelog?.sections.length && (prev.has(item.id) || !manuallyChangedIdsRef.current.has(item.id))) {
          next.add(item.id);
        }
      });
      return next;
    });
  }, [changelogEntries, items]);

  const toggleExpand = (id: string) => {
    manuallyChangedIdsRef.current.add(id);
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  return (
    <div className={surface.panel}>
      {items.length === 0 ? (
        <div className={text.emptyStateMuted}>
          <p>{emptyMessage}</p>
        </div>
      ) : (
        <div className={table.scrollX}>
          <div className={updatesTableMinWidthClass}>
            <div className={cn(table.headerBase, updatesTableGridClass)}>
              <span aria-hidden="true"></span>
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
                const deprecated = Boolean(item.deprecation);
                const pauseBusy = pauseBusyIds.has(item.id);
                const packageTypeLabel = resolvePackageTypeLabel(item.packageType, t, '?', item.typeLabel);
                const installedVersionLabel =
                  getInstalledVersionLabel(
                    item.installedVersion,
                    item.detectedResult,
                    t('package:sidebar.versionUnknown'),
                  ) || '?';
                const changelog = changelogEntries[item.id];
                const changelogSections = changelog?.sections || [];
                const hasChangelog = changelogSections.length > 0;
                const isExpanded = expandedIds.has(item.id);

                return (
                  <div key={item.id}>
                    <div
                      className={cn(
                        table.rowBase,
                        table.rowRelaxed,
                        updatesTableGridClass,
                        'transition-none hover:bg-transparent dark:hover:bg-transparent',
                      )}
                    >
                      <div className="flex justify-center">
                        {hasChangelog ? (
                          <button
                            type="button"
                            onClick={() => toggleExpand(item.id)}
                            className={cn(
                              changelogToggleButtonClass,
                              isExpanded ? changelogToggleActiveClass : changelogToggleInactiveClass,
                            )}
                            title={t('sections.changelog')}
                            aria-label={t('sections.changelog')}
                            aria-expanded={isExpanded}
                          >
                            <History size={16} />
                          </button>
                        ) : (
                          <div className="w-7 shrink-0" />
                        )}
                      </div>
                      <div className="min-w-0">
                        <PackageNameLink id={item.id} name={item.name} source="updates" />
                        {deprecated ? (
                          <div className="mt-1">
                            <DeprecatedPackageChip message={item.deprecation?.message || ''} />
                          </div>
                        ) : null}
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
                            {deprecated ? (
                              <>
                                <button
                                  className={table.actionButtonSubtle}
                                  onClick={() => (paused ? onTogglePause(item, false) : onUpdate(item))}
                                  disabled={bulkUpdating || pauseBusy}
                                  type="button"
                                >
                                  {paused ? (pauseBusy ? t('table.saving') : t('table.resume')) : t('table.update')}
                                </button>
                                <button
                                  className={removeActionButtonClass}
                                  onClick={() => onRemove(item)}
                                  disabled={bulkUpdating || pauseBusy}
                                  title={t('package:actions.remove')}
                                  aria-label={t('package:actions.remove')}
                                  type="button"
                                >
                                  <Trash2 size={16} />
                                </button>
                              </>
                            ) : paused ? (
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
                    {hasChangelog && isExpanded && (
                      <div className={changelogPanelClass}>
                        {changelogSections.map((section, index) => (
                          <UpdatesChangelogSection
                            key={`${section.version || 'raw'}-${section.date || index}`}
                            section={section}
                          />
                        ))}
                      </div>
                    )}
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
