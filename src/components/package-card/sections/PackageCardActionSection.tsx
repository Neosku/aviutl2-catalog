import type { MouseEvent } from 'react';
import { CheckCircle2, Download, RefreshCw, Trash2 } from 'lucide-react';
import ProgressCircle from '../../ProgressCircle';
import type { PackageCardActionHandler } from '../types';

interface PackageCardActionSectionProps {
  isInstalled: boolean;
  hasUpdate: boolean;
  canInstall: boolean;
  downloading: boolean;
  updating: boolean;
  removing: boolean;
  downloadRatio: number;
  updateRatio: number;
  installedVersion?: string;
  onDownload: PackageCardActionHandler;
  onUpdate: PackageCardActionHandler;
  onRemove: PackageCardActionHandler;
}

function handleActionClick(action: PackageCardActionHandler) {
  return (event: MouseEvent<HTMLButtonElement>) => {
    event.stopPropagation();
    void action();
  };
}

export default function PackageCardActionSection({
  isInstalled,
  hasUpdate,
  canInstall,
  downloading,
  updating,
  removing,
  downloadRatio,
  updateRatio,
  installedVersion,
  onDownload,
  onUpdate,
  onRemove,
}: PackageCardActionSectionProps) {
  return (
    <div className="flex items-end justify-between gap-3">
      <div className="flex items-center mb-1">
        {isInstalled ? (
          <div className="flex items-center gap-1.5 text-xs font-mono text-slate-500 dark:text-slate-400">
            <CheckCircle2 size={14} className={hasUpdate ? 'text-amber-500' : 'text-emerald-500'} />
            <span>{installedVersion}</span>
          </div>
        ) : null}
      </div>

      <div className="flex items-center gap-2 shrink-0 w-[140px] justify-end">
        {isInstalled ? (
          <>
            {hasUpdate ? (
              <button
                className="h-9 flex-1 bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400 border border-amber-200 dark:border-amber-800/50 hover:bg-amber-100 dark:hover:bg-amber-900/30 text-xs font-bold rounded-lg transition-colors flex items-center justify-center gap-1.5 cursor-pointer disabled:cursor-not-allowed"
                onClick={handleActionClick(onUpdate)}
                disabled={updating || !canInstall}
              >
                {updating ? (
                  <ProgressCircle
                    value={updateRatio}
                    size={16}
                    strokeWidth={3}
                    className="text-amber-600 dark:text-amber-400"
                  />
                ) : (
                  <RefreshCw size={14} strokeWidth={2.5} className="animate-spin-slow" />
                )}
                <span>更新</span>
              </button>
            ) : (
              <div className="h-9 flex-1 bg-slate-100 dark:bg-slate-800 text-emerald-600 dark:text-emerald-400 text-xs font-bold rounded-lg flex items-center justify-center gap-1 cursor-default border border-slate-200 dark:border-slate-700">
                <CheckCircle2 size={14} />
                <span>導入済</span>
              </div>
            )}
            <button
              className="h-9 w-9 shrink-0 flex items-center justify-center text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors cursor-pointer disabled:cursor-not-allowed"
              title="削除"
              onClick={handleActionClick(onRemove)}
              disabled={removing}
            >
              <Trash2 size={16} />
            </button>
          </>
        ) : (
          <button
            className="h-9 w-full bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-1.5 shadow-lg shadow-blue-600/20 hover:shadow-blue-600/30 active:scale-95 cursor-pointer disabled:cursor-not-allowed"
            onClick={handleActionClick(onDownload)}
            disabled={downloading || !canInstall}
          >
            {downloading ? (
              <ProgressCircle value={downloadRatio} size={16} strokeWidth={3} className="text-white" />
            ) : (
              <Download size={14} strokeWidth={2.5} />
            )}
            <span>インストール</span>
          </button>
        )}
      </div>
    </div>
  );
}
