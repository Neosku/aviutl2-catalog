/**
 * インストーラーテストセクションのコンポーネント
 */
import { useMemo } from 'react';
import Badge from '@/components/ui/Badge';
import Button from '@/components/ui/Button';
import { AlertCircle, Download, Trash2 } from 'lucide-react';
import ProgressCircle from '../../../../components/ProgressCircle';
import type { RegisterTestOperation, RegisterTestSectionProps } from '../types';
import { layout, surface, text } from '@/components/ui/_styles';
import { cn } from '@/lib/cn';

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

const operationPathBoxClass = `min-w-0 ${surface.panelRoundedSubtle} p-1`;
const operationPathTextClass = 'break-all font-mono text-[11px] text-slate-700 dark:text-slate-200';
const testStatusCardClass = `space-y-3 ${surface.panelSubtle} p-4 dark:bg-slate-800/40`;
const progressTrackClass = 'h-1.5 w-full rounded-full bg-slate-200/70 dark:bg-slate-700/70';
const validationAlertClass =
  'flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 p-3 text-amber-700 dark:border-amber-900/50 dark:bg-amber-900/20 dark:text-amber-200';
const operationLogPanelClass = `max-h-56 space-y-2 overflow-y-auto ${surface.panelLg} p-2 dark:bg-slate-900/60`;
const operationMetaPanelClass = `${surface.panelRounded} p-1.5`;
const operationTargetPanelClass = `space-y-1 ${surface.panelRounded} px-1.5 py-1 text-[11px] font-mono text-slate-600 dark:text-slate-300`;
const operationDetailPanelClass = `whitespace-pre-wrap break-all ${surface.panelRounded} px-1.5 py-1 text-[11px] text-slate-600 dark:text-slate-300`;
const progressFillClass = 'h-full rounded-full transition-all';

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
      <div className={text.labelXsSemibold}>実行ログ</div>
      {operations.length ? (
        <div className={operationLogPanelClass}>
          {operations.map((operation) => {
            const kindLabel = KIND_LABELS[operation.kind];
            const showSummary = !!operation.summary && operation.summary !== kindLabel;
            const hasFromTo = !!operation.fromPath || !!operation.toPath;
            return (
              <div
                key={operation.key}
                className={cn(surface.baseMuted, 'space-y-1 rounded-md bg-slate-50 px-2 py-1.5 dark:bg-slate-800/70')}
              >
                <div className={layout.wrapItemsGap1}>
                  <Badge
                    shape="rounded"
                    size="xxs"
                    className="border-slate-300 bg-slate-100 text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
                  >
                    {kindLabel}
                  </Badge>
                  <Badge shape="rounded" size="xxs" className={operationStatusClass(operation.status)}>
                    {STATUS_LABELS[operation.status]}
                  </Badge>
                </div>
                {showSummary && <div className={text.bodyXsStrong}>{operation.summary}</div>}
                {hasFromTo && (
                  <div className={operationMetaPanelClass}>
                    <div className="space-y-1">
                      <div className={operationPathBoxClass}>
                        <div className={text.tinyMutedStrong}>元のパス</div>
                        <div className={operationPathTextClass}>{operation.fromPath || '-'}</div>
                      </div>
                      <div className="text-center text-xs text-slate-400 dark:text-slate-500">↓</div>
                      <div className={operationPathBoxClass}>
                        <div className={text.tinyMutedStrong}>先のパス</div>
                        <div className={operationPathTextClass}>{operation.toPath || '-'}</div>
                      </div>
                    </div>
                  </div>
                )}
                {operation.targetPath && !hasFromTo && (
                  <div className={operationTargetPanelClass}>
                    <div className="break-all">
                      <span className="mr-1 font-sans text-[10px] font-semibold text-slate-500 dark:text-slate-400">
                        対象パス:
                      </span>
                      {operation.targetPath}
                    </div>
                  </div>
                )}
                {operation.detail && <div className={operationDetailPanelClass}>{operation.detail}</div>}
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
    <section className={surface.cardSectionStack}>
      <div className={layout.rowBetweenWrapGap3}>
        <div className="space-y-1">
          <h2 className={text.titleLg}>インストーラー / 削除テスト</h2>
          <p className={text.mutedXs}>現在の設定でインストールと削除の動作を確認します。</p>
        </div>
        <div className={layout.wrapItemsGap2}>
          <Button
            variant="primary"
            size="actionXs"
            type="button"
            className="shadow-sm"
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
          </Button>
          <Button
            variant="danger"
            size="actionXs"
            type="button"
            className="shadow-sm"
            onClick={onUninstallerTest}
            disabled={uninstallerTestRunning || !!uninstallerTestValidation}
            title={uninstallerTestValidation || ''}
          >
            <Trash2 size={14} />
            <span>{uninstallerTestRunning ? '実行中…' : '削除テスト'}</span>
          </Button>
        </div>
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        <div className={testStatusCardClass}>
          <div className={text.labelXsSemibold}>インストールテスト</div>
          <div className={layout.wrapItemsGap3}>
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
                <div className={cn('text-sm font-semibold', installerTestTone)}>{installerTestLabel}</div>
              )}
              <div className={text.mutedXs}>{installerTestPercent}%</div>
            </div>
          </div>
          <div className={progressTrackClass}>
            {/* Keep phase-color switch local: this bar color is tightly coupled to test phase state. */}
            <div
              className={cn(
                progressFillClass,
                installerTestPhase === 'error'
                  ? 'bg-red-500'
                  : installerTestPhase === 'done'
                    ? 'bg-emerald-500'
                    : 'bg-blue-500',
              )}
              style={installerProgressStyle}
            />
          </div>
          {installerTestPhase === 'done' && (
            <div className={text.mutedXs}>
              検出バージョン:
              <span className="ml-1 font-mono text-slate-700 dark:text-slate-200">
                {installerTestDetectedVersion || '未検出'}
              </span>
            </div>
          )}
          {installerTestValidation && (
            <div className={validationAlertClass}>
              <AlertCircle size={16} className="mt-0.5 flex-shrink-0" />
              <span className="text-xs">{installerTestValidation}</span>
            </div>
          )}
          {installerTestError && (
            <div className={surface.dangerBox}>
              <div className="text-xs font-semibold">エラー</div>
              <div className="whitespace-pre-line text-xs">{installerTestError}</div>
            </div>
          )}
          <OperationList operations={installerTestOperations} />
        </div>
        <div className={testStatusCardClass}>
          <div className={text.labelXsSemibold}>削除テスト</div>
          <div className={layout.wrapItemsGap3}>
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
                <div className={cn('text-sm font-semibold', uninstallerTestTone)}>{uninstallerTestLabel}</div>
              )}
              <div className={text.mutedXs}>{uninstallerTestPercent}%</div>
            </div>
          </div>
          <div className={progressTrackClass}>
            {/* Keep phase-color switch local: this bar color is tightly coupled to test phase state. */}
            <div
              className={cn(
                progressFillClass,
                uninstallerTestPhase === 'error'
                  ? 'bg-red-500'
                  : uninstallerTestPhase === 'done'
                    ? 'bg-emerald-500'
                    : 'bg-blue-500',
              )}
              style={uninstallerProgressStyle}
            />
          </div>
          {uninstallerTestValidation && (
            <div className={validationAlertClass}>
              <AlertCircle size={16} className="mt-0.5 flex-shrink-0" />
              <span className="text-xs">{uninstallerTestValidation}</span>
            </div>
          )}
          {uninstallerTestError && (
            <div className={surface.dangerBox}>
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
