/**
 * インストーラーテストセクションのコンポーネント
 */
import React, { useMemo } from 'react';
import { AlertCircle, Download, Trash2 } from 'lucide-react';
import ProgressCircle from '../../../../components/ProgressCircle.jsx';
import type { RegisterTestSectionProps } from '../types';

export default function RegisterTestSection({
  installerTestRunning,
  installerTestValidation,
  installerTestRatio,
  installerTestPhase,
  installerTestTone,
  installerTestLabel,
  installerTestPercent,
  installerTestDetectedVersion,
  installerTestError,
  uninstallerTestRunning,
  uninstallerTestValidation,
  uninstallerTestRatio,
  uninstallerTestPhase,
  uninstallerTestTone,
  uninstallerTestLabel,
  uninstallerTestPercent,
  uninstallerTestError,
  onInstallerTest,
  onUninstallerTest,
}: RegisterTestSectionProps) {
  const installerProgressStyle = useMemo(() => ({ width: `${installerTestPercent}%` }), [installerTestPercent]);
  const uninstallerProgressStyle = useMemo(() => ({ width: `${uninstallerTestPercent}%` }), [uninstallerTestPercent]);

  return (
    <section className="space-y-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="space-y-1">
          <h2 className="text-lg font-bold text-slate-800 dark:text-slate-100">インストーラー / 削除テスト</h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            現在の設定でインストールと削除の動作を確認します。
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-xs font-semibold text-white shadow-sm transition hover:bg-blue-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 disabled:cursor-not-allowed disabled:opacity-60 dark:hover:bg-blue-500"
            onClick={onInstallerTest}
            disabled={installerTestRunning || !!installerTestValidation}
            title={installerTestValidation || ''}
          >
            {installerTestRunning ? (
              <ProgressCircle
                value={installerTestRatio}
                size={16}
                strokeWidth={3}
                className="text-white"
                ariaLabel="インストーラーテストの進行度"
              />
            ) : (
              <Download size={14} />
            )}
            <span>{installerTestRunning ? '実行中…' : 'インストールテスト'}</span>
          </button>
          <button
            type="button"
            className="inline-flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-4 py-2 text-xs font-semibold text-red-700 shadow-sm transition hover:bg-red-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500 disabled:cursor-not-allowed disabled:opacity-60 dark:border-red-800/60 dark:bg-red-900/20 dark:text-red-200 dark:hover:bg-red-900/30"
            onClick={onUninstallerTest}
            disabled={uninstallerTestRunning || !!uninstallerTestValidation}
            title={uninstallerTestValidation || ''}
          >
            <Trash2 size={14} />
            <span>{uninstallerTestRunning ? '実行中…' : '削除テスト'}</span>
          </button>
        </div>
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        <div className="space-y-3 rounded-xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-800/40">
          <div className="text-xs font-semibold text-slate-600 dark:text-slate-300">インストールテスト</div>
          <div className="flex flex-wrap items-center gap-3">
            <ProgressCircle
              value={installerTestRatio}
              size={32}
              strokeWidth={3}
              className={installerTestTone}
              ariaLabel="インストーラーテストの進行度"
              showComplete={installerTestPhase === 'done'}
            />
            <div className="space-y-1">
              {installerTestLabel && (
                <div className={`text-sm font-semibold ${installerTestTone}`}>{installerTestLabel}</div>
              )}
              <div className="text-xs text-slate-500 dark:text-slate-400">{installerTestPercent}%</div>
            </div>
          </div>
          <div className="h-1.5 w-full rounded-full bg-slate-200/70 dark:bg-slate-700/70">
            <div
              className={`h-full rounded-full transition-all ${
                installerTestPhase === 'error'
                  ? 'bg-red-500'
                  : installerTestPhase === 'done'
                    ? 'bg-emerald-500'
                    : 'bg-blue-500'
              }`}
              style={installerProgressStyle}
            />
          </div>
          {installerTestPhase === 'done' && (
            <div className="text-xs text-slate-500 dark:text-slate-400">
              検出バージョン:
              <span className="ml-1 font-mono text-slate-700 dark:text-slate-200">
                {installerTestDetectedVersion || '未検出'}
              </span>
            </div>
          )}
          {installerTestValidation && (
            <div className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 p-3 text-amber-700 dark:border-amber-900/50 dark:bg-amber-900/20 dark:text-amber-200">
              <AlertCircle size={16} className="mt-0.5 flex-shrink-0" />
              <span className="text-xs">{installerTestValidation}</span>
            </div>
          )}
          {installerTestError && (
            <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-red-700 dark:border-red-900/50 dark:bg-red-900/20 dark:text-red-200">
              <div className="text-xs font-semibold">エラー</div>
              <div className="whitespace-pre-line text-xs">{installerTestError}</div>
            </div>
          )}
        </div>
        <div className="space-y-3 rounded-xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-800/40">
          <div className="text-xs font-semibold text-slate-600 dark:text-slate-300">削除テスト</div>
          <div className="flex flex-wrap items-center gap-3">
            <ProgressCircle
              value={uninstallerTestRatio}
              size={32}
              strokeWidth={3}
              className={uninstallerTestTone}
              ariaLabel="削除テストの進行度"
              showComplete={uninstallerTestPhase === 'done'}
            />
            <div className="space-y-1">
              {uninstallerTestLabel && (
                <div className={`text-sm font-semibold ${uninstallerTestTone}`}>{uninstallerTestLabel}</div>
              )}
              <div className="text-xs text-slate-500 dark:text-slate-400">{uninstallerTestPercent}%</div>
            </div>
          </div>
          <div className="h-1.5 w-full rounded-full bg-slate-200/70 dark:bg-slate-700/70">
            <div
              className={`h-full rounded-full transition-all ${
                uninstallerTestPhase === 'error'
                  ? 'bg-red-500'
                  : uninstallerTestPhase === 'done'
                    ? 'bg-emerald-500'
                    : 'bg-blue-500'
              }`}
              style={uninstallerProgressStyle}
            />
          </div>
          {uninstallerTestValidation && (
            <div className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 p-3 text-amber-700 dark:border-amber-900/50 dark:bg-amber-900/20 dark:text-amber-200">
              <AlertCircle size={16} className="mt-0.5 flex-shrink-0" />
              <span className="text-xs">{uninstallerTestValidation}</span>
            </div>
          )}
          {uninstallerTestError && (
            <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-red-700 dark:border-red-900/50 dark:bg-red-900/20 dark:text-red-200">
              <div className="text-xs font-semibold">エラー</div>
              <div className="whitespace-pre-line text-xs">{uninstallerTestError}</div>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
