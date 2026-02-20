import React from 'react';
import { CheckCircle2, Download, RefreshCw, Trash2 } from 'lucide-react';
import ProgressCircle from '../../../../../components/ProgressCircle';
import type { PackageSidebarSectionProps } from '../../types';

type PackageSidebarActionsCardProps = Pick<
  PackageSidebarSectionProps,
  | 'item'
  | 'canInstall'
  | 'downloading'
  | 'updating'
  | 'removing'
  | 'downloadProgress'
  | 'updateProgress'
  | 'onDownload'
  | 'onUpdate'
  | 'onRemove'
>;

export default function PackageSidebarActionsCard({
  item,
  canInstall,
  downloading,
  updating,
  removing,
  downloadProgress,
  updateProgress,
  onDownload,
  onUpdate,
  onRemove,
}: PackageSidebarActionsCardProps) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900 space-y-3">
      {item.installed ? (
        <>
          {item.isLatest ? (
            <div className="inline-flex items-center gap-2 rounded-full bg-green-100 px-3 py-1 text-xs font-bold text-green-700 dark:bg-green-900/40 dark:text-green-300">
              <CheckCircle2 size={14} /> 最新{item.installedVersion ? `（${item.installedVersion}）` : ''}
            </div>
          ) : (
            <button
              className="h-10 px-4 bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400 border border-amber-200 dark:border-amber-800/50 hover:bg-amber-100 dark:hover:bg-amber-900/30 text-sm font-bold rounded-lg transition-colors flex items-center justify-center gap-2 w-full"
              onClick={() => void onUpdate()}
              disabled={!canInstall || updating}
              type="button"
            >
              {updating ? (
                <span className="flex items-center gap-2">
                  <ProgressCircle
                    value={updateProgress.ratio}
                    size={20}
                    strokeWidth={3}
                    className="text-amber-600 dark:text-amber-400"
                    ariaLabel={`${updateProgress.label} ${updateProgress.percent}%`}
                  />
                  {updateProgress.label} {`${updateProgress.percent}%`}
                </span>
              ) : (
                <>
                  <RefreshCw size={18} /> 更新
                </>
              )}
            </button>
          )}
          <button className="btn btn--danger w-full" onClick={() => void onRemove()} disabled={removing} type="button">
            {removing ? (
              '削除中…'
            ) : (
              <>
                <Trash2 size={18} /> 削除
              </>
            )}
          </button>
        </>
      ) : (
        <button
          className="btn btn--primary w-full"
          onClick={() => void onDownload()}
          disabled={!canInstall || downloading}
          type="button"
        >
          {downloading ? (
            <span className="flex items-center gap-2">
              <ProgressCircle
                value={downloadProgress.ratio}
                size={20}
                strokeWidth={3}
                ariaLabel={`${downloadProgress.label} ${downloadProgress.percent}%`}
              />
              {downloadProgress.label} {`${downloadProgress.percent}%`}
            </span>
          ) : (
            <>
              <Download size={18} /> インストール
            </>
          )}
        </button>
      )}
    </div>
  );
}
