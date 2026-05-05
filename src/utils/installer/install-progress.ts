import { i18n } from '@/i18n';
import type { DownloadProgress, InstallerAction, InstallProgressPayload, InstallProgressPhase } from './types';

const STEP_PROGRESS_LABELS: Record<string, string> = {
  download: 'common:installerActions.download',
  extract: 'common:installerActions.extract',
  extractSfx: 'common:installerActions.extract',
  copy: 'common:installerActions.copy',
  delete: 'common:installerActions.delete',
  run: 'common:installerActions.run',
  runAuoSetup: 'common:installerActions.run',
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
      if (phase === 'done') return i18n.t('common:status.done');
      if (phase === 'init') return i18n.t('common:status.preparing');
      if (phase === 'error') return i18n.t('common:status.error');
      const action = step?.action;
      return i18n.t(STEP_PROGRESS_LABELS[String(action || '')] || 'common:status.processing');
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
