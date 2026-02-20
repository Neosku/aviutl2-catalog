/**
 * インストーラーテストセクションのコンポーネント
 */
import React, { useMemo } from 'react';
import { AlertCircle, Download, Trash2 } from 'lucide-react';
import ProgressCircle from '../../../../components/ProgressCircle';
import type { RegisterTestOperation, RegisterTestSectionProps } from '../types';

const KIND_LABELS: Record<RegisterTestOperation['kind'], string> = {
  download: 'ダウンロード',
  extract: '展開',
  extract_sfx: 'SFX展開',
  copy: 'コピー',
  delete: '削除',
  run: '実行',
  error: 'エラー',
};

const STATUS_LABELS: Record<RegisterTestOperation['status'], string> = {
  done: '完了',
  skip: 'スキップ',
  error: '失敗',
};

function operationStatusClass(status: RegisterTestOperation['status']): string {
  switch (status) {
    case 'error':
      return 'border-red-300 bg-red-100 text-red-700 dark:border-red-800/80 dark:bg-red-900/40 dark:text-red-200';
    case 'skip':
      return 'border-amber-300 bg-amber-100 text-amber-700 dark:border-amber-800/80 dark:bg-amber-900/40 dark:text-amber-200';
    case 'done':
      return 'border-emerald-300 bg-emerald-100 text-emerald-700 dark:border-emerald-800/80 dark:bg-emerald-900/40 dark:text-emerald-200';
    default: {
      const unreachableStatus: never = status;
      return unreachableStatus;
    }
  }
}

function OperationList({ operations }: { operations: RegisterTestOperation[] }) {
  return (
    <div className="space-y-2">
      <div className="text-xs font-semibold text-slate-600 dark:text-slate-300">実行ログ</div>
      {operations.length ? (
        <div className="max-h-56 space-y-2 overflow-y-auto rounded-lg border border-slate-200 bg-white p-2 dark:border-slate-700 dark:bg-slate-900/60">
          {operations.map((operation) => {
            const kindLabel = KIND_LABELS[operation.kind];
            const showSummary = !!operation.summary && operation.summary !== kindLabel;
            const hasFromTo = !!operation.fromPath || !!operation.toPath;
            return (
              <div
                key={operation.key}
                className="space-y-1 rounded-md border border-slate-200 bg-slate-50 px-2 py-1.5 dark:border-slate-700 dark:bg-slate-800/70"
              >
                <div className="flex flex-wrap items-center gap-1">
                  <span className="rounded border border-slate-300 bg-slate-100 px-1.5 py-0.5 text-[10px] font-semibold text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200">
                    {kindLabel}
                  </span>
                  <span
                    className={`rounded border px-1.5 py-0.5 text-[10px] font-semibold ${operationStatusClass(operation.status)}`}
                  >
                    {STATUS_LABELS[operation.status]}
                  </span>
                </div>
                {showSummary && <div className="text-xs text-slate-700 dark:text-slate-200">{operation.summary}</div>}
                {hasFromTo && (
                  <div className="rounded border border-slate-200 bg-white p-1.5 dark:border-slate-700 dark:bg-slate-900">
                    <div className="space-y-1">
                      <div className="min-w-0 rounded border border-slate-200 bg-slate-50 p-1 dark:border-slate-700 dark:bg-slate-800/70">
                        <div className="text-[10px] font-semibold text-slate-500 dark:text-slate-400">元のパス</div>
                        <div className="break-all font-mono text-[11px] text-slate-700 dark:text-slate-200">
                          {operation.fromPath || '-'}
                        </div>
                      </div>
                      <div className="text-center text-xs text-slate-400 dark:text-slate-500">↓</div>
                      <div className="min-w-0 rounded border border-slate-200 bg-slate-50 p-1 dark:border-slate-700 dark:bg-slate-800/70">
                        <div className="text-[10px] font-semibold text-slate-500 dark:text-slate-400">先のパス</div>
                        <div className="break-all font-mono text-[11px] text-slate-700 dark:text-slate-200">
                          {operation.toPath || '-'}
                        </div>
                      </div>
                    </div>
                  </div>
                )}
                {operation.targetPath && !hasFromTo && (
                  <div className="space-y-1 rounded border border-slate-200 bg-white px-1.5 py-1 text-[11px] font-mono text-slate-600 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300">
                    <div className="break-all">
                      <span className="mr-1 font-sans text-[10px] font-semibold text-slate-500 dark:text-slate-400">
                        対象パス:
                      </span>
                      {operation.targetPath}
                    </div>
                  </div>
                )}
                {operation.detail && (
                  <div className="whitespace-pre-wrap break-all rounded border border-slate-200 bg-white px-1.5 py-1 text-[11px] text-slate-600 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300">
                    {operation.detail}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      ) : (
        <div className="rounded-lg border border-dashed border-slate-300 bg-slate-100/70 px-3 py-2 text-xs text-slate-500 dark:border-slate-700 dark:bg-slate-800/40 dark:text-slate-400">
          実行ログはありません。
        </div>
      )}
    </div>
  );
}

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
  installerTestOperations,
  uninstallerTestRunning,
  uninstallerTestValidation,
  uninstallerTestRatio,
  uninstallerTestPhase,
  uninstallerTestTone,
  uninstallerTestLabel,
  uninstallerTestPercent,
  uninstallerTestError,
  uninstallerTestOperations,
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
          <OperationList operations={installerTestOperations} />
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
          <OperationList operations={uninstallerTestOperations} />
        </div>
      </div>
    </section>
  );
}
