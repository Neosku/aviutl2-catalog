import { Download, FolderOpen, Upload } from 'lucide-react';
import type { DataManagementSectionProps } from '../types';

export default function DataManagementSection({
  syncBusy,
  syncStatus,
  onExport,
  onImport,
}: DataManagementSectionProps) {
  return (
    <section className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
      <div className="px-6 py-3 border-b border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50 flex items-center gap-2">
        <FolderOpen size={18} className="text-slate-500 dark:text-slate-400" />
        <h3 className="font-bold text-sm text-slate-700 dark:text-slate-200">データ管理</h3>
      </div>
      <div className="p-6 space-y-6">
        <div className="space-y-3">
          <div className="text-sm font-medium">パッケージ一覧のエクスポート / インポート</div>
          <div className="flex flex-wrap gap-2">
            <button
              className="flex items-center gap-2 px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 text-sm hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer"
              onClick={onExport}
              disabled={syncBusy}
              type="button"
            >
              <Download size={16} />
              エクスポート
            </button>
            <button
              className="flex items-center gap-2 px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 text-sm hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer"
              onClick={onImport}
              disabled={syncBusy}
              type="button"
            >
              <Upload size={16} />
              インポート
            </button>
          </div>
          {syncStatus && <div className="text-xs text-slate-500 dark:text-slate-400">{syncStatus}</div>}
        </div>
      </div>
    </section>
  );
}
