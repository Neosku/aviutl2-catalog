import { ArrowUpDown, CheckCircle2, ChevronDown, ChevronUp, Filter, Layers, Tags, X } from 'lucide-react';
import type { FiltersSectionProps } from '../types';

export default function FiltersSection({
  categories,
  selectedCategory,
  filteredCount,
  filterInstalled,
  selectedTags,
  sortedSelectedTags,
  sortedAllTags,
  isFilterExpanded,
  isSortMenuOpen,
  sortOrder,
  sortOptions,
  onCategoryChange,
  onToggleInstalled,
  onToggleFilterExpanded,
  onToggleSortMenu,
  onCloseSortMenu,
  onSelectSortOrder,
  onToggleTag,
  onClearTags,
}: FiltersSectionProps) {
  return (
    <div className="sticky top-0 z-30 bg-slate-50/95 dark:bg-slate-950/95 backdrop-blur supports-[backdrop-filter]:bg-slate-50/80 -mx-6 mb-6 border-b border-slate-200 dark:border-slate-800 shadow-sm transition-all">
      <div className="px-6 py-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2 max-w-full overflow-hidden">
            <div className="flex items-center gap-1.5 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider shrink-0 select-none">
              <Layers size={14} className="opacity-70" />
              <span>種類</span>
            </div>
            <div className="flex flex-1 items-center gap-1 bg-slate-200/50 dark:bg-slate-800/50 p-1 rounded-lg border border-slate-200 dark:border-slate-800 overflow-x-auto scrollbar-hide">
              {categories.map((category) => (
                <button
                  key={category}
                  onClick={() => onCategoryChange(category)}
                  className={`px-3 py-2 rounded-md text-sm font-medium transition-all whitespace-nowrap cursor-pointer ${
                    selectedCategory === category
                      ? 'bg-blue-600 text-white shadow-md'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-300/50 dark:hover:bg-slate-700/50'
                  }`}
                  type="button"
                >
                  {category}
                </button>
              ))}
            </div>
          </div>

          <div className="flex items-center gap-2 ml-auto">
            <div className="flex items-baseline px-3 py-2 bg-slate-100 dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 mr-2 h-[38px] min-w-[4rem] justify-center">
              <span className="text-lg font-black text-slate-700 dark:text-slate-200 tabular-nums leading-none">
                {filteredCount}
              </span>
              <span className="text-xs font-bold text-slate-500 dark:text-slate-400 ml-1">件</span>
            </div>

            <button
              onClick={onToggleInstalled}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg border text-sm font-medium transition-all whitespace-nowrap cursor-pointer ${
                filterInstalled
                  ? 'bg-emerald-50 border-emerald-200 text-emerald-700 dark:bg-emerald-900/20 dark:border-emerald-800 dark:text-emerald-400'
                  : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800'
              }`}
              type="button"
            >
              <CheckCircle2
                size={16}
                className={
                  filterInstalled ? 'text-emerald-500 fill-emerald-500/20' : 'text-slate-300 dark:text-slate-600'
                }
              />
              インストール済
            </button>

            <button
              onClick={onToggleFilterExpanded}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg border text-sm font-medium transition-all whitespace-nowrap cursor-pointer ${
                isFilterExpanded || selectedTags.length > 0
                  ? 'bg-blue-50 border-blue-200 text-blue-700 dark:bg-blue-900/20 dark:border-blue-800 dark:text-blue-400'
                  : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800'
              }`}
              type="button"
            >
              <Filter size={16} />
              タグ絞り込み
              {selectedTags.length > 0 ? (
                <span className="ml-1 bg-blue-600 text-white text-[10px] font-bold w-5 h-5 flex items-center justify-center rounded-full shadow-sm">
                  {selectedTags.length}
                </span>
              ) : null}
              {isFilterExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
            </button>

            <div className="relative">
              <button
                onClick={onToggleSortMenu}
                className="flex items-center gap-2 px-4 py-2 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-500 transition-colors whitespace-nowrap cursor-pointer"
                title="並び替え"
                type="button"
              >
                <ArrowUpDown size={16} />
                <span className="text-sm font-medium text-slate-600 dark:text-slate-300">
                  {sortOptions.find((option) => option.value === sortOrder)?.label || '並び替え'}
                </span>
                <ChevronDown size={14} />
              </button>
              {isSortMenuOpen ? (
                <>
                  <button
                    type="button"
                    aria-label="並び替えメニューを閉じる"
                    className="fixed inset-0 z-10"
                    onClick={onCloseSortMenu}
                  />
                  <div className="absolute right-0 top-full mt-2 w-56 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl shadow-xl z-20 py-1 origin-top-right animate-in fade-in zoom-in-95 duration-100">
                    {sortOptions.map((option) => (
                      <button
                        key={option.value}
                        onClick={() => onSelectSortOrder(option.value)}
                        className={`w-full text-left px-4 py-2.5 text-sm flex items-center justify-between hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors cursor-pointer ${
                          sortOrder === option.value
                            ? 'text-blue-600 font-bold bg-blue-50 dark:bg-blue-900/10'
                            : 'text-slate-600 dark:text-slate-300'
                        }`}
                        type="button"
                      >
                        {option.label}
                        {sortOrder === option.value ? <CheckCircle2 size={14} /> : null}
                      </button>
                    ))}
                  </div>
                </>
              ) : null}
            </div>
          </div>
        </div>

        {!isFilterExpanded && selectedTags.length > 0 ? (
          <div className="flex flex-wrap items-center gap-2 mt-4 animate-in slide-in-from-top-1">
            <span className="text-sm text-slate-400 font-medium">選択中:</span>
            {sortedSelectedTags.map((tag) => (
              <button
                key={tag}
                onClick={() => onToggleTag(tag)}
                className="flex items-center gap-1.5 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-300 px-3 py-1 rounded-md border border-blue-100 dark:border-blue-800/50 text-sm hover:bg-blue-100 dark:hover:bg-blue-900/40 transition-colors cursor-pointer"
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
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-1.5 text-slate-500 dark:text-slate-400">
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
                  className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all border cursor-pointer ${
                    selectedTags.includes(tag)
                      ? 'bg-blue-600 border-blue-600 text-white shadow-md shadow-blue-500/20'
                      : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:border-slate-300 dark:hover:border-slate-600 hover:bg-slate-50 dark:hover:bg-slate-700/50'
                  }`}
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
