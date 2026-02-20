import React from 'react';
import { Check, CheckCircle2, Download } from 'lucide-react';
import ProgressCircle from '../../../../components/ProgressCircle';
import type { PackagesSectionProps } from '../types';

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
    <div className="flex-1 flex flex-col animate-in fade-in slide-in-from-right-8 duration-500 h-full max-w-2xl mx-auto w-full">
      <div className="text-center mb-6 mt-2 shrink-0">
        <h2 className="text-2xl font-bold text-slate-900 dark:text-white">推奨パッケージの導入</h2>
        {allRequiredInstalled ? (
          <p className="text-sm text-emerald-600 dark:text-emerald-400 font-bold mt-2 flex items-center justify-center gap-2 animate-in fade-in slide-in-from-bottom-1">
            <CheckCircle2 size={16} />
            すべての推奨パッケージが導入済みです
          </p>
        ) : (
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-2">
            標準的な利用に必要となる基本プラグインをインストールします
          </p>
        )}
      </div>

      {packagesLoading ? (
        <div className="flex-1 flex flex-col items-center justify-center text-slate-400 gap-3">
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
                <div
                  key={id}
                  className="group flex items-center gap-4 p-4 rounded-xl border border-slate-200 bg-white  dark:border-slate-800 dark:bg-slate-900 transition-all shadow-sm"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 truncate">
                        {item?.name || id}
                      </h3>
                      {packageVersions[id] && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded font-mono font-bold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700">
                          {packageVersions[id]}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-slate-500 dark:text-slate-400 truncate leading-relaxed">
                      {item?.summary || '詳細情報を取得できませんでした'}
                    </p>
                  </div>

                  <div className="shrink-0">
                    {state.downloading ? (
                      <div className="flex items-center gap-3 bg-slate-50 dark:bg-slate-800 px-3 py-1.5 rounded-full border border-slate-200 dark:border-slate-700">
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
                      </div>
                    ) : state.installed ? (
                      <span className="flex items-center gap-1.5 text-[10px] font-bold text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/20 px-3 py-1.5 rounded-full">
                        <Check size={12} strokeWidth={4} /> インストール済
                      </span>
                    ) : (
                      <span className="text-[10px] font-bold text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 px-3 py-1.5 rounded-full border border-slate-200 dark:border-slate-700">
                        未インストール
                      </span>
                    )}
                  </div>
                </div>
              );
            })}

            {packagesError && (
              <div className="text-xs font-medium text-red-600 bg-red-50 dark:bg-red-900/20 p-3 rounded-lg border border-red-100 dark:border-red-900/30">
                {packagesError}
              </div>
            )}
            {packagesDownloadError && (
              <div className="text-xs font-medium text-red-600 bg-red-50 dark:bg-red-900/20 p-3 rounded-lg border border-red-100 dark:border-red-900/30">
                {packagesDownloadError}
              </div>
            )}
          </div>

          <div className="shrink-0 pt-6 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-4 mt-2">
            <button
              className="h-11 px-8 rounded-xl border border-slate-200 dark:border-slate-800 text-sm font-bold text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-900/50 transition-all cursor-pointer"
              onClick={onBack}
            >
              戻る
            </button>
            <div className="flex items-center gap-4">
              {!allRequiredInstalled && (
                <button
                  className="h-11 px-8 rounded-xl border border-slate-200 dark:border-slate-800 text-sm font-bold text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-900/50 transition-all cursor-pointer"
                  onClick={onSkip}
                  disabled={bulkDownloading}
                >
                  インストールせずに次へ
                </button>
              )}
              <button
                className="btn btn--primary h-11 px-8 rounded-xl shadow-lg shadow-blue-600/20 hover:shadow-blue-600/30 transition-all font-bold bg-blue-600 hover:bg-blue-700 text-white cursor-pointer"
                onClick={onInstallAndNext}
                disabled={bulkDownloading}
              >
                {bulkDownloading ? (
                  <span className="flex items-center gap-2">
                    <div className="spinner border-white/30 border-t-white" />
                    インストール中…
                  </span>
                ) : allRequiredInstalled ? (
                  '次へ'
                ) : (
                  <span className="flex items-center gap-2">
                    <Download size={18} />
                    まとめてインストールして次へ
                  </span>
                )}
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
