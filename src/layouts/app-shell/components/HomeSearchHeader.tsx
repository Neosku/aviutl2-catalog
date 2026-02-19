import type { ChangeEvent } from 'react';
import { Search, X } from 'lucide-react';

interface HomeSearchHeaderProps {
  searchQuery: string;
  onSearchQueryChange: (next: string) => void;
}

export default function HomeSearchHeader({ searchQuery, onSearchQueryChange }: HomeSearchHeaderProps) {
  const handleChange = (event: ChangeEvent<HTMLInputElement>) => {
    onSearchQueryChange(event.target.value);
  };

  return (
    <header className="h-16 bg-white/80 dark:bg-slate-900/80 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between px-6 shrink-0 gap-4 sticky top-0 z-10 transition-all select-none">
      <div className="flex items-center gap-3 flex-1 max-w-2xl relative">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
          <input
            type="text"
            placeholder="パッケージ名、作者、キーワードで検索..."
            className="w-full pl-10 pr-10 py-2 bg-white/95 dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none transition-all text-sm text-slate-900 dark:text-slate-100 placeholder-slate-500 dark:placeholder-slate-400 shadow-sm"
            value={searchQuery}
            onChange={handleChange}
          />
          {searchQuery ? (
            <button
              onClick={() => onSearchQueryChange('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer p-0.5 rounded-full hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors"
              type="button"
            >
              <X size={14} />
            </button>
          ) : null}
        </div>
      </div>
    </header>
  );
}
