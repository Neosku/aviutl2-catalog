import {
  ArrowDownToLine,
  ArrowUpDown,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Circle,
  Filter,
  Layers,
  Tags,
  X,
} from 'lucide-react';
import Button from '@/components/ui/Button';
import type { FiltersSectionProps } from '../types';
import {
  INSTALL_STATUS_LABELS,
  INSTALL_STATUS_OPTIONS,
  SORT_OPTIONS,
  SORT_OPTION_LABELS,
} from '../../../../layouts/app-shell/constants';
import { cn } from '@/lib/cn';
import { layout, state, surface } from '@/components/ui/_styles';

function renderInstallStatusIcon(status: FiltersSectionProps['installStatus'], tone: 'accent' | 'neutral' = 'neutral') {
  if (status === 'installed') {
    return tone === 'accent' ? (
      <CheckCircle2
        size={16}
        className="text-emerald-600 dark:text-emerald-300 fill-emerald-600/20 dark:fill-emerald-300/20"
      />
    ) : (
      <CheckCircle2 size={16} className="text-slate-600 dark:text-slate-300 fill-slate-600/10 dark:fill-slate-300/10" />
    );
  }

  if (status === 'not_installed') {
    return <Circle size={16} className="text-slate-600 dark:text-slate-300" />;
  }

  return <ArrowDownToLine size={16} className="text-slate-600 dark:text-slate-300" />;
}

export default function FiltersSection({
  categories,
  selectedCategory,
  filteredCount,
  installStatus,
  selectedTags,
  sortedSelectedTags,
  sortedAllTags,
  isFilterExpanded,
  isInstallMenuOpen,
  isSortMenuOpen,
  sortOrder,
  onCategoryChange,
  onToggleInstallMenu,
  onCloseInstallMenu,
  onSelectInstallStatus,
  onToggleFilterExpanded,
  onToggleSortMenu,
  onCloseSortMenu,
  onSelectSortOrder,
  onToggleTag,
  onClearTags,
}: FiltersSectionProps) {
  const installButtonLabel = INSTALL_STATUS_LABELS[installStatus];
  const installButtonVariant =
    installStatus === 'installed' ? 'accentEmerald' : installStatus === 'not_installed' ? 'muted' : 'secondary';
  const neutralControlTextClass = 'text-slate-600 dark:text-slate-300';
  const dropdownPanelClass = cn(
    surface.baseMuted,
    state.enterZoomIn95,
    'absolute right-0 top-full mt-2 w-44 bg-white dark:bg-slate-900 rounded-xl shadow-xl z-20 py-1 origin-top-right duration-100',
  );
  const dropdownItemBaseClass =
    'w-full text-left px-4 py-2.5 text-sm hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors cursor-pointer';
  const dropdownItemSelectedClass = 'text-slate-800 font-bold bg-slate-100 dark:bg-slate-800/80 dark:text-slate-100';
  const dropdownItemIdleClass = 'text-slate-600 dark:text-slate-300';
  const installButtonTextClass =
    installStatus === 'installed' ? 'text-emerald-600 dark:text-emerald-300' : neutralControlTextClass;
  const selectedSortLabel = SORT_OPTION_LABELS[sortOrder];

  return (
    <div className="sticky top-0 z-30 bg-slate-50/95 dark:bg-slate-950/95 backdrop-blur supports-[backdrop-filter]:bg-slate-50/80 -mx-6 mb-6 border-b border-slate-200 dark:border-slate-800 shadow-sm transition-all">
      <div className="px-6 py-3">
        <div className={layout.rowBetweenWrapGap3}>
          <div className={cn(layout.inlineGap2, 'max-w-full overflow-hidden')}>
            <div
              className={cn(
                layout.inlineGap1_5,
                'text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider shrink-0 select-none',
              )}
            >
              <Layers size={14} className="opacity-70" />
              <span>種類</span>
            </div>
            <div
              className={cn(
                surface.panelLgSubtle,
                'flex flex-1 items-center gap-1 p-1 bg-slate-200/50 dark:bg-slate-800/50 overflow-x-auto scrollbar-hide',
              )}
            >
              {categories.map((category) => (
                <button
                  key={category}
                  onClick={() => onCategoryChange(category)}
                  className={cn(
                    'px-3 py-2 rounded-md text-sm font-medium transition-all whitespace-nowrap cursor-pointer',
                    selectedCategory === category
                      ? 'bg-blue-600 text-white shadow-md'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-300/50 dark:hover:bg-slate-700/50',
                  )}
                  type="button"
                >
                  {category}
                </button>
              ))}
            </div>
          </div>

          <div className={cn(layout.inlineGap2, 'ml-auto')}>
            <div
              className={cn(
                surface.panelLg,
                'flex items-baseline px-3 py-2 bg-slate-100 dark:bg-slate-800 mr-2 h-[38px] min-w-[4rem] justify-center',
              )}
            >
              <span className={cn('text-lg font-black tabular-nums leading-none', neutralControlTextClass)}>
                {filteredCount}
              </span>
              <span className={cn('text-xs font-bold ml-1', neutralControlTextClass)}>件</span>
            </div>

            <div className="relative">
              <Button
                onClick={onToggleInstallMenu}
                variant={installButtonVariant}
                size="actionSm"
                className="whitespace-nowrap cursor-pointer"
                type="button"
              >
                {renderInstallStatusIcon(installStatus, installStatus === 'installed' ? 'accent' : 'neutral')}
                <span className={cn('text-sm font-medium', installButtonTextClass)}>{installButtonLabel}</span>
                <ChevronDown size={14} />
              </Button>
              {isInstallMenuOpen ? (
                <>
                  <button
                    type="button"
                    aria-label="インストール状態メニューを閉じる"
                    className="fixed inset-0 z-10"
                    onClick={onCloseInstallMenu}
                  />
                  <div className={dropdownPanelClass}>
                    {INSTALL_STATUS_OPTIONS.map((option) => (
                      <button
                        key={option.value}
                        onClick={() => onSelectInstallStatus(option.value)}
                        className={cn(
                          dropdownItemBaseClass,
                          installStatus === option.value ? dropdownItemSelectedClass : dropdownItemIdleClass,
                        )}
                        type="button"
                      >
                        <span className="flex items-center gap-2">
                          {renderInstallStatusIcon(option.value)}
                          <span>{option.label}</span>
                        </span>
                      </button>
                    ))}
                  </div>
                </>
              ) : null}
            </div>

            <Button
              onClick={onToggleFilterExpanded}
              variant={isFilterExpanded || selectedTags.length > 0 ? 'accentBlue' : 'secondary'}
              size="actionSm"
              className={cn('whitespace-nowrap cursor-pointer', neutralControlTextClass)}
              type="button"
            >
              <Filter size={16} className={neutralControlTextClass} />
              <span className={cn('text-sm font-medium', neutralControlTextClass)}>タグ絞り込み</span>
              {selectedTags.length > 0 ? (
                <span
                  className={cn(
                    layout.center,
                    'ml-1 bg-blue-600 text-white text-[10px] font-bold w-5 h-5 rounded-full shadow-sm',
                  )}
                >
                  {selectedTags.length}
                </span>
              ) : null}
              {isFilterExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
            </Button>

            <div className="relative">
              <Button
                onClick={onToggleSortMenu}
                variant="secondary"
                size="actionSm"
                className={cn('whitespace-nowrap cursor-pointer', neutralControlTextClass)}
                title="並び替え"
                type="button"
              >
                <ArrowUpDown size={16} className={neutralControlTextClass} />
                <span className={cn('text-sm font-medium', neutralControlTextClass)}>{selectedSortLabel}</span>
                <ChevronDown size={14} />
              </Button>
              {isSortMenuOpen ? (
                <>
                  <button
                    type="button"
                    aria-label="並び替えメニューを閉じる"
                    className="fixed inset-0 z-10"
                    onClick={onCloseSortMenu}
                  />
                  <div className={dropdownPanelClass}>
                    {SORT_OPTIONS.map((option) => (
                      <button
                        key={option.value}
                        onClick={() => onSelectSortOrder(option.value)}
                        className={cn(
                          dropdownItemBaseClass,
                          sortOrder === option.value ? dropdownItemSelectedClass : dropdownItemIdleClass,
                        )}
                        type="button"
                      >
                        <span>{option.label}</span>
                      </button>
                    ))}
                  </div>
                </>
              ) : null}
            </div>
          </div>
        </div>

        {!isFilterExpanded && selectedTags.length > 0 ? (
          <div className={cn(layout.wrapItemsGap2, 'mt-4 animate-in slide-in-from-top-1')}>
            <span className="text-sm text-slate-400 font-medium">選択中:</span>
            {sortedSelectedTags.map((tag) => (
              <button
                key={tag}
                onClick={() => onToggleTag(tag)}
                className={cn(
                  layout.inlineGap1_5,
                  'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-300 px-3 py-1 rounded-md border border-blue-100 dark:border-blue-800/50 text-sm hover:bg-blue-100 dark:hover:bg-blue-900/40 transition-colors cursor-pointer',
                )}
                type="button"
              >
                {tag}
                <X size={14} />
              </button>
            ))}
            <button
              onClick={onClearTags}
              className="text-sm text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 underline decoration-slate-300 underline-offset-2 ml-2 cursor-pointer"
              type="button"
            >
              すべてクリア
            </button>
          </div>
        ) : null}

        {isFilterExpanded ? (
          <div className="mt-4 pt-4 border-t border-slate-100 dark:border-slate-800 animate-in slide-in-from-top-2 fade-in duration-200">
            <div className={cn(layout.rowBetween, 'mb-3')}>
              <div className={cn(layout.inlineGap1_5, 'text-slate-500 dark:text-slate-400')}>
                <Tags size={14} />
                <span className="text-sm font-bold uppercase tracking-wider">すべてのタグ</span>
              </div>
              {selectedTags.length > 0 ? (
                <button
                  onClick={onClearTags}
                  className="text-sm text-red-500 hover:text-red-600 font-medium cursor-pointer"
                  type="button"
                >
                  選択をクリア
                </button>
              ) : null}
            </div>

            <div className="flex flex-wrap gap-2 max-h-[60vh] overflow-y-auto pr-2 custom-scrollbar">
              {sortedAllTags.map((tag) => (
                <button
                  key={tag}
                  onClick={() => onToggleTag(tag)}
                  className={cn(
                    'px-3 py-1.5 rounded-full text-xs font-medium transition-all border cursor-pointer',
                    selectedTags.includes(tag)
                      ? 'bg-blue-600 border-blue-600 text-white shadow-md shadow-blue-500/20'
                      : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:border-slate-300 dark:hover:border-slate-600 hover:bg-slate-50 dark:hover:bg-slate-700/50',
                  )}
                  type="button"
                >
                  {tag}
                </button>
              ))}
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
