import type { InstallerAction } from '../catalogSchema';
import type { DownloadProgress, InstallProgressPayload, InstallProgressPhase } from './types';

const STEP_PROGRESS_LABELS: Record<string, string> = {
  download: 'ダウンロード',
  extract: '展開中',
  extract_sfx: '展開中',
  copy: '配置中',
  delete: '削除中',
  run: '実行中',
  run_auo_setup: '実行中',
};

type ProgressCallback = ((progress: InstallProgressPayload) => void) | undefined;

export function createInstallProgressTools(totalSteps: number, onProgress: ProgressCallback) {
  const buildProgressPayload = (
    completedUnits: number,
    step: InstallerAction | null,
    index: number | null,
    phase: InstallProgressPhase,
  ): InstallProgressPayload => {
    const safeUnits = Number.isFinite(completedUnits) ? completedUnits : 0;
    const ratio = totalSteps <= 0 ? (phase === 'done' ? 1 : 0) : Math.min(1, Math.max(0, safeUnits / totalSteps));
    const label = (() => {
      if (phase === 'done') return '完了';
      if (phase === 'init') return '準備中…';
      if (phase === 'error') return 'エラーが発生しました';
      const action = step?.action;
      return STEP_PROGRESS_LABELS[String(action || '')] || '処理中…';
    })();
    return {
      ratio,
      percent: Math.round(ratio * 100),
      step: step?.action ?? null,
      stepIndex: typeof index === 'number' && Number.isInteger(index) && index >= 0 ? index : null,
      totalSteps,
      label,
      phase,
    };
  };

  const emitProgress = (
    completedUnits: number,
    step: InstallerAction | null,
    index: number | null,
    phase: InstallProgressPhase,
  ): void => {
    if (typeof onProgress !== 'function') return;
    try {
      onProgress(buildProgressPayload(completedUnits, step, index, phase));
    } catch {
      // UI side errors should not break installer flow
    }
  };

  const createDownloadProgressReporter = (step: InstallerAction, idx: number, startUnits: number) => {
    const stepSpan = 1;
    const maxUnits = idx + 1 - 0.01;
    let unknownUnits = startUnits;
    return ({ read, total }: DownloadProgress): void => {
      if (typeof total === 'number' && total > 0) {
        const ratio = Math.min(1, Math.max(0, total ? read / total : 0));
        const units = startUnits + stepSpan * ratio;
        emitProgress(units, step, idx, 'running');
        return;
      }
      if (read > 0) {
        const increment = stepSpan * 0.05;
        unknownUnits = Math.min(maxUnits, unknownUnits + increment);
        emitProgress(unknownUnits, step, idx, 'running');
      }
    };
  };

  return { emitProgress, createDownloadProgressReporter };
}
