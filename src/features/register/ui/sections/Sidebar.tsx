/**
 * サイドバーのコンポーネント
 */
import React from 'react';
import Button from '@/components/ui/Button';
import Badge from '@/components/ui/Badge';
import { Plus, Search } from 'lucide-react';
import type { RegisterSidebarProps } from '../types';
import DeleteButton from '../components/DeleteButton';
import { layout, surface } from '@/components/ui/_styles';
import { cn } from '@/lib/cn';

const sidebarSectionLabelClass = 'text-xs font-bold uppercase tracking-wider text-slate-400';
const unselectedItemClass = 'border-transparent hover:bg-slate-50 dark:hover:bg-slate-800';

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
      <div className={cn(surface.card, 'p-4 lg:h-full')}>
        <div className="space-y-3 lg:flex lg:h-full lg:min-h-0 lg:flex-col lg:space-y-0 lg:overflow-hidden">
          <Button
            variant="primary"
            size="cta"
            radius="xl"
            type="button"
            className="w-full border-blue-600 shadow-sm hover:shadow-md dark:border-blue-500 dark:bg-blue-500 dark:hover:bg-blue-400 lg:mb-3 lg:shrink-0"
            onClick={onStartNewPackage}
          >
            <Plus size={18} />
            新規パッケージ作成
          </Button>
          <div className="space-y-2 rounded-xl border border-slate-200/80 bg-slate-50/70 p-3 dark:border-slate-800 dark:bg-slate-900/40 lg:mb-3 lg:shrink-0">
            <div className={layout.rowBetweenGap2}>
              <div className={sidebarSectionLabelClass}>送信予定一覧</div>
              {hasDraftPackages && (
                <Badge shape="rounded" size="xxs" className={headerStatusClass}>
                  {submitListTestStatus}
                </Badge>
              )}
            </div>
            <div className="max-h-52 overflow-y-auto space-y-1 pr-1 custom-scrollbar lg:max-h-[30vh]">
              {draftPackages.map((draft) => {
                const isSelected = selectedPackageId === draft.packageId;
                const isTestReady = draft.readyForSubmit;
                return (
                  <div
                    key={draft.draftId}
                    className={cn(
                      'group flex items-center rounded-lg border px-2 py-1.5 transition',
                      isSelected
                        ? 'border-blue-500 bg-blue-50 dark:border-blue-500/50 dark:bg-blue-900/20'
                        : unselectedItemClass,
                    )}
                  >
                    <Button
                      variant="plain"
                      size="none"
                      type="button"
                      className="min-w-0 flex-1 flex-col items-start justify-start gap-0 text-left"
                      onClick={() => onOpenDraftPackage(draft.draftId)}
                    >
                      <div
                        className={cn(
                          'truncate text-sm font-semibold',
                          isSelected ? 'text-blue-700 dark:text-blue-300' : 'text-slate-700 dark:text-slate-200',
                        )}
                        title={draft.packageName || draft.packageId}
                      >
                        {draft.packageName || draft.packageId}
                      </div>
                      <div className={layout.inlineGap1_5}>
                        <div className="truncate text-[11px] text-slate-500 dark:text-slate-400">
                          {formatSavedAt(draft.savedAt)}
                        </div>
                        <Badge
                          shape="rounded"
                          size="xxs"
                          className={cn(
                            'shrink-0',
                            isTestReady
                              ? 'border-emerald-300 bg-emerald-100 text-emerald-700 dark:border-emerald-800/80 dark:bg-emerald-900/40 dark:text-emerald-200'
                              : 'border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900/50 dark:bg-amber-900/20 dark:text-amber-200',
                          )}
                        >
                          {isTestReady ? 'テスト完了' : 'テスト未完了'}
                        </Badge>
                      </div>
                    </Button>
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
                <div className={surface.dashedSoftPlaceholder}>送信予定のパッケージはありません</div>
              )}
            </div>
          </div>
          <div className="space-y-2 rounded-xl border border-slate-200/80 bg-white p-3 dark:border-slate-800 dark:bg-slate-900 lg:flex lg:min-h-0 lg:flex-1 lg:flex-col">
            <div className={sidebarSectionLabelClass}>パッケージ一覧</div>
            <div className="relative lg:shrink-0">
              <Search size={16} className={layout.inputIconLeft} />
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
                <div className={cn(layout.center, 'py-8 text-sm text-slate-500')}>
                  <span className="spinner mr-2" />
                  読み込み中...
                </div>
              ) : (
                filteredPackages.map((item) => {
                  const isSelected = selectedPackageId === item.id;
                  return (
                    <Button
                      variant="plain"
                      size="none"
                      key={item.id}
                      type="button"
                      onClick={() => onSelectPackage(item)}
                      className={cn(
                        'group flex w-full flex-col items-start justify-start gap-0.5 rounded-lg border px-3 py-2.5 text-left text-sm transition-all',
                        isSelected
                          ? 'border-blue-500 bg-blue-50 shadow-sm dark:bg-blue-900/20 dark:border-blue-500/50'
                          : unselectedItemClass,
                      )}
                    >
                      <span
                        className={cn(
                          'font-semibold',
                          isSelected ? 'text-blue-700 dark:text-blue-300' : 'text-slate-700 dark:text-slate-200',
                        )}
                      >
                        {item.name || item.id}
                      </span>
                      <span
                        className={cn(
                          'text-xs',
                          isSelected ? 'text-blue-600/80 dark:text-blue-400/80' : 'text-slate-500 dark:text-slate-400',
                        )}
                      >
                        {item.author || '作者不明'}
                      </span>
                    </Button>
                  );
                })
              )}
              {catalogLoadState === 'loaded' && filteredPackages.length === 0 && (
                <div className={cn(surface.dashedSoftPlaceholder, 'px-4 py-8 text-sm')}>該当なし</div>
              )}
            </div>
          </div>
        </div>
      </div>
    </aside>
  );
}
