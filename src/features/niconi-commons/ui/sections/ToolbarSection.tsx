import { Search } from 'lucide-react';
import type { ToolbarSectionProps } from '../types';
import { layout, page, text } from '@/components/ui/_styles';
import { cn } from '@/lib/cn';

export default function ToolbarSection({ visibleCount, selectedCount, query, onQueryChange }: ToolbarSectionProps) {
  return (
    <div className={page.toolbarRow}>
      <div className={cn(text.mutedSm, layout.wrapItemsGap2)}>
        <span>表示 {visibleCount}件</span>
        <span className="text-slate-300 dark:text-slate-600">/</span>
        <span>選択 {selectedCount}件</span>
      </div>
      <div className="relative w-full sm:w-72">
        <Search className={layout.inputIconLeft} size={16} />
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
