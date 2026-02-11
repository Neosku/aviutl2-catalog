/**
 * サイドバーのコンポーネント
 */
import React from 'react';
import { Plus, Search } from 'lucide-react';
import type { RegisterSidebarProps } from '../types';
import DeleteButton from '../components/DeleteButton';

function formatSavedAt(savedAt: number) {
  try {
    return new Intl.DateTimeFormat('ja-JP', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    }).format(new Date(savedAt));
  } catch {
    return '';
  }
}

export default function RegisterSidebar({
  packageSearch,
  catalogLoadState,
  filteredPackages,
  draftPackages,
  selectedPackageId,
  onPackageSearchChange,
  onSelectPackage,
  onStartNewPackage,
  onOpenDraftPackage,
  onDeleteDraftPackage,
}: RegisterSidebarProps) {
  const hasDraftPackages = draftPackages.length > 0;
  const blockedDraftCount = draftPackages.filter((draft) => !draft.readyForSubmit).length;
  const submitListTestStatus = blockedDraftCount > 0 ? `${blockedDraftCount}件テスト未完了` : 'テスト完了';
  const headerStatusClass =
    blockedDraftCount > 0
      ? 'border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900/50 dark:bg-amber-900/20 dark:text-amber-200'
      : 'border-emerald-300 bg-emerald-100 text-emerald-700 dark:border-emerald-800/80 dark:bg-emerald-900/40 dark:text-emerald-200';

  return (
    <aside className="lg:sticky lg:top-6 lg:self-start lg:h-[calc(100dvh-32px-3rem)]">
      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900 lg:h-full">
        <div className="space-y-3 lg:flex lg:h-full lg:min-h-0 lg:flex-col lg:space-y-0 lg:overflow-hidden">
          <button
            type="button"
            className="flex w-full items-center justify-center gap-2 rounded-xl border border-blue-600 bg-blue-600 px-4 py-3 text-sm font-bold text-white shadow-sm transition hover:bg-blue-700 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 dark:border-blue-500 dark:bg-blue-500 dark:hover:bg-blue-400 lg:mb-3 lg:shrink-0"
            onClick={onStartNewPackage}
          >
            <Plus size={18} />
            新規パッケージ作成
          </button>
          <div className="space-y-2 rounded-xl border border-slate-200/80 bg-slate-50/70 p-3 dark:border-slate-800 dark:bg-slate-900/40 lg:mb-3 lg:shrink-0">
            <div className="flex items-center justify-between gap-2">
              <div className="text-xs font-bold uppercase tracking-wider text-slate-400">送信予定一覧</div>
              {hasDraftPackages && (
                <span className={`rounded-md border px-1.5 py-0.5 text-[10px] font-semibold ${headerStatusClass}`}>
                  {submitListTestStatus}
                </span>
              )}
            </div>
            <div className="max-h-52 overflow-y-auto space-y-1 pr-1 custom-scrollbar lg:max-h-[30vh]">
              {draftPackages.map((draft) => {
                const isSelected = selectedPackageId === draft.packageId;
                const isTestReady = draft.readyForSubmit;
                return (
                  <div
                    key={draft.draftId}
                    className={`group flex items-center rounded-lg border px-2 py-1.5 transition ${
                      isSelected
                        ? 'border-blue-500 bg-blue-50 dark:border-blue-500/50 dark:bg-blue-900/20'
                        : 'border-transparent hover:bg-slate-50 dark:hover:bg-slate-800'
                    }`}
                  >
                    <button
                      type="button"
                      className="min-w-0 flex-1 text-left"
                      onClick={() => onOpenDraftPackage(draft.draftId)}
                    >
                      <div
                        className={`truncate text-sm font-semibold ${
                          isSelected ? 'text-blue-700 dark:text-blue-300' : 'text-slate-700 dark:text-slate-200'
                        }`}
                        title={draft.packageName || draft.packageId}
                      >
                        {draft.packageName || draft.packageId}
                      </div>
                      <div className="flex items-center gap-1.5">
                        <div className="truncate text-[11px] text-slate-500 dark:text-slate-400">
                          {formatSavedAt(draft.savedAt)}
                        </div>
                        <span
                          className={`shrink-0 rounded-md border px-1.5 py-0.5 text-[10px] font-semibold ${
                            isTestReady
                              ? 'border-emerald-300 bg-emerald-100 text-emerald-700 dark:border-emerald-800/80 dark:bg-emerald-900/40 dark:text-emerald-200'
                              : 'border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900/50 dark:bg-amber-900/20 dark:text-amber-200'
                          }`}
                        >
                          {isTestReady ? 'テスト完了' : 'テスト未完了'}
                        </span>
                      </div>
                    </button>
                    <DeleteButton
                      ariaLabel={`${draft.packageId} の一時保存を削除`}
                      onClick={(event) => {
                        event.stopPropagation();
                        onDeleteDraftPackage(draft.draftId);
                      }}
                    />
                  </div>
                );
              })}
              {draftPackages.length === 0 && (
                <div className="rounded-lg border border-dashed border-slate-200 bg-slate-50 px-3 py-4 text-center text-xs text-slate-500 dark:border-slate-800 dark:bg-slate-900/50 dark:text-slate-400">
                  送信予定のパッケージはありません
                </div>
              )}
            </div>
          </div>
          <div className="space-y-2 rounded-xl border border-slate-200/80 bg-white p-3 dark:border-slate-800 dark:bg-slate-900 lg:flex lg:min-h-0 lg:flex-1 lg:flex-col">
            <div className="text-xs font-bold uppercase tracking-wider text-slate-400">パッケージ一覧</div>
            <div className="relative lg:shrink-0">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="search"
                value={packageSearch}
                onChange={(e) => onPackageSearchChange(e.target.value)}
                placeholder="パッケージを検索..."
                className="w-full pl-9"
              />
            </div>
            <div className="max-h-72 overflow-y-auto space-y-1 pr-1 custom-scrollbar lg:max-h-none lg:min-h-0 lg:flex-1">
              {catalogLoadState === 'loading' || catalogLoadState === 'idle' ? (
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
              {catalogLoadState === 'loaded' && filteredPackages.length === 0 && (
                <div className="rounded-lg border border-dashed border-slate-200 bg-slate-50 px-4 py-8 text-center text-sm text-slate-500 dark:border-slate-800 dark:bg-slate-900/50 dark:text-slate-400">
                  該当なし
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </aside>
  );
}
