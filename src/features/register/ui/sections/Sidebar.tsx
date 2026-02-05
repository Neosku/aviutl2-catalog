/**
 * サイドバーのコンポーネント
 */
import React from 'react';
import { Plus, Search } from 'lucide-react';
import type { RegisterSidebarProps } from '../types';

export default function RegisterSidebar({
  packageSearch,
  catalogLoading,
  catalogLoaded,
  filteredPackages,
  selectedPackageId,
  onPackageSearchChange,
  onSelectPackage,
  onStartNewPackage,
}: RegisterSidebarProps) {
  return (
    <aside className="space-y-6">
      <div className="sticky top-6 space-y-4">
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="space-y-3">
            <div className="relative">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="search"
                value={packageSearch}
                onChange={(e) => onPackageSearchChange(e.target.value)}
                placeholder="パッケージを検索..."
                className="w-full pl-9"
              />
            </div>
            <div className="space-y-2">
              <div className="text-xs font-bold uppercase tracking-wider text-slate-400">パッケージ一覧</div>
              <div className="max-h-[calc(100vh-300px)] min-h-[300px] overflow-y-auto space-y-1 pr-1 custom-scrollbar">
                {catalogLoading && !catalogLoaded ? (
                  <div className="flex items-center justify-center py-8 text-sm text-slate-500">
                    <span className="spinner mr-2" />
                    読み込み中...
                  </div>
                ) : (
                  filteredPackages.map((item) => {
                    const isSelected = selectedPackageId === item.id;
                    return (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => onSelectPackage(item)}
                        className={`group flex w-full flex-col gap-0.5 rounded-lg border px-3 py-2.5 text-left text-sm transition-all ${
                          isSelected
                            ? 'border-blue-500 bg-blue-50 shadow-sm dark:bg-blue-900/20 dark:border-blue-500/50'
                            : 'border-transparent hover:bg-slate-50 dark:hover:bg-slate-800'
                        }`}
                      >
                        <span
                          className={`font-semibold ${
                            isSelected ? 'text-blue-700 dark:text-blue-300' : 'text-slate-700 dark:text-slate-200'
                          }`}
                        >
                          {item.name || item.id}
                        </span>
                        <span
                          className={`text-xs ${
                            isSelected ? 'text-blue-600/80 dark:text-blue-400/80' : 'text-slate-500 dark:text-slate-400'
                          }`}
                        >
                          {item.author || '作者不明'}
                        </span>
                      </button>
                    );
                  })
                )}
                {!catalogLoading && filteredPackages.length === 0 && (
                  <div className="rounded-lg border border-dashed border-slate-200 bg-slate-50 px-4 py-8 text-center text-sm text-slate-500 dark:border-slate-800 dark:bg-slate-900/50 dark:text-slate-400">
                    該当なし
                  </div>
                )}
              </div>
            </div>
            <button
              type="button"
              className="flex w-full items-center justify-center gap-2 rounded-lg border-2 border-dashed border-slate-300 bg-transparent px-4 py-3 text-sm font-bold text-slate-600 transition hover:border-blue-500 hover:bg-blue-50 hover:text-blue-600 dark:border-slate-700 dark:text-slate-400 dark:hover:bg-blue-900/20 dark:hover:text-blue-400"
              onClick={onStartNewPackage}
            >
              <Plus size={18} />
              新規パッケージ作成
            </button>
          </div>
        </div>
      </div>
    </aside>
  );
}
