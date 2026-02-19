import { Search } from 'lucide-react';
import type { ToolbarSectionProps } from '../types';

export default function ToolbarSection({ visibleCount, selectedCount, query, onQueryChange }: ToolbarSectionProps) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
      <div className="flex flex-wrap items-center gap-2 text-sm text-slate-500 dark:text-slate-400">
        <span>表示 {visibleCount}件</span>
        <span className="text-slate-300 dark:text-slate-600">/</span>
        <span>選択 {selectedCount}件</span>
      </div>
      <div className="relative w-full sm:w-72">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
        <input
          type="search"
          placeholder="パッケージ名/ID/作者/コモンズID"
          value={query}
          onChange={(event) => onQueryChange(event.target.value)}
          className="pl-9"
        />
      </div>
    </div>
  );
}
