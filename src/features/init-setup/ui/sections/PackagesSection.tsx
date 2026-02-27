import React from 'react';
import Badge from '@/components/ui/Badge';
import Button from '@/components/ui/Button';
import { Check, CheckCircle2, Download } from 'lucide-react';
import ProgressCircle from '../../../../components/ProgressCircle';
import type { PackagesSectionProps } from '../types';
import { cn } from '@/lib/cn';
import { action, layout, state, surface, text } from '@/components/ui/_styles';

export default function PackagesSection({
  requiredPackages,
  packageVersions,
  allRequiredInstalled,
  packagesLoading,
  packagesError,
  packagesDownloadError,
  bulkDownloading,
  onBack,
  onSkip,
  onInstallAndNext,
}: PackagesSectionProps) {
  return (
    <div className={cn(layout.centerCol, state.enterSlideRight500, 'h-full max-w-2xl w-full flex-1')}>
      <div className="text-center mb-6 mt-2 shrink-0">
        <h2 className={text.title2xl}>推奨パッケージの導入</h2>
        {allRequiredInstalled ? (
          <p
            className={cn(
              layout.inlineGap2,
              'text-sm text-emerald-600 dark:text-emerald-400 font-bold mt-2 justify-center animate-in fade-in slide-in-from-bottom-1',
            )}
          >
            <CheckCircle2 size={16} />
            すべての推奨パッケージが導入済みです
          </p>
        ) : (
          <p className={text.mutedSmMt2}>標準的な利用に必要となる基本プラグインをインストールします</p>
        )}
      </div>

      {packagesLoading ? (
        <div className={cn(layout.centerCol, 'flex-1 gap-3 text-slate-400')}>
          <div className="spinner w-8 h-8 border-4 border-slate-200 dark:border-slate-800 border-t-blue-500" />
          <span className="text-sm font-medium">パッケージ情報を取得中…</span>
        </div>
      ) : (
        <>
          <div className="flex-1 overflow-y-auto min-h-0 space-y-3 pr-2 -mr-2 pb-4">
            {requiredPackages.map(({ id, item, state }) => {
              const progress = state.progress;
              const ratio = progress?.ratio ?? 0;
              const progressPercent = progress?.percent;
              const percent = Number.isFinite(progressPercent) ? progressPercent : Math.round(ratio * 100);

              return (
                <div key={id} className={cn(surface.panel, 'group flex items-center gap-4 p-4 transition-all')}>
                  <div className="flex-1 min-w-0">
                    <div className={cn(layout.inlineGap2, 'mb-1')}>
                      <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 truncate">
                        {item?.name || id}
                      </h3>
                      {packageVersions[id] && (
                        <Badge
                          shape="rounded"
                          size="xxs"
                          className="font-mono font-bold bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400"
                        >
                          {packageVersions[id]}
                        </Badge>
                      )}
                    </div>
                    <p className={cn(text.mutedXsTruncate, 'leading-relaxed')}>
                      {item?.summary || '詳細情報を取得できませんでした'}
                    </p>
                  </div>

                  <div className="shrink-0">
                    {state.downloading ? (
                      <Badge
                        variant="outlineNeutral"
                        shape="pill"
                        size="sm"
                        className="gap-3 bg-slate-50 px-3 py-1.5 dark:bg-slate-800"
                      >
                        <div className="text-[10px] font-black text-slate-700 dark:text-slate-300 w-10 text-right tabular-nums">
                          {percent}%
                        </div>
                        <ProgressCircle
                          value={ratio}
                          size={18}
                          strokeWidth={3}
                          ariaLabel={`${item?.name || id} の進捗`}
                          className="text-blue-600 dark:text-blue-400"
                        />
                      </Badge>
                    ) : state.installed ? (
                      <Badge
                        shape="pill"
                        size="sm"
                        className={cn(
                          layout.inlineGap1_5,
                          'bg-emerald-50 px-3 py-1.5 text-[10px] font-bold text-emerald-700 dark:border-emerald-500/20 dark:bg-emerald-500/10 dark:text-emerald-400',
                        )}
                      >
                        <Check size={12} strokeWidth={4} /> インストール済
                      </Badge>
                    ) : (
                      <Badge
                        shape="pill"
                        size="sm"
                        className="bg-slate-100 px-3 py-1.5 text-[10px] font-bold text-slate-600 dark:bg-slate-800 dark:text-slate-300"
                      >
                        未インストール
                      </Badge>
                    )}
                  </div>
                </div>
              );
            })}

            {packagesError && <div className={surface.dangerText}>{packagesError}</div>}
            {packagesDownloadError && <div className={surface.dangerText}>{packagesDownloadError}</div>}
          </div>

          <div
            className={cn(
              layout.rowBetween,
              'mt-2 shrink-0 gap-4 border-t border-slate-100 pt-6 dark:border-slate-800',
            )}
          >
            <Button variant="secondary" size="none" radius="xl" className={action.initSecondary} onClick={onBack}>
              戻る
            </Button>
            <div className="flex items-center gap-4">
              {!allRequiredInstalled && (
                <Button
                  variant="secondary"
                  size="none"
                  radius="xl"
                  className={action.initSecondary}
                  onClick={onSkip}
                  disabled={bulkDownloading}
                >
                  インストールせずに次へ
                </Button>
              )}
              <Button
                variant="primary"
                size="none"
                radius="xl"
                className={action.initPrimary}
                onClick={onInstallAndNext}
                disabled={bulkDownloading}
              >
                {bulkDownloading ? (
                  <span className={layout.inlineGap2}>
                    <div className={action.spinnerWhite} />
                    インストール中…
                  </span>
                ) : allRequiredInstalled ? (
                  '次へ'
                ) : (
                  <span className={layout.inlineGap2}>
                    <Download size={18} />
                    まとめてインストールして次へ
                  </span>
                )}
              </Button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
