import { Download, FolderOpen, Upload } from 'lucide-react';
import type { DataManagementSectionProps } from '../types';
import { action, layout, surface, text } from '@/components/ui/_styles';

export default function DataManagementSection({
  syncBusy,
  syncStatus,
  onExport,
  onImport,
}: DataManagementSectionProps) {
  return (
    <section className={surface.panelOverflow}>
      <div className={surface.sectionHeader}>
        <FolderOpen size={18} className="text-slate-500 dark:text-slate-400" />
        <h3 className={text.headingSmBold}>データ管理</h3>
      </div>
      <div className="p-6 space-y-6">
        <div className="space-y-3">
          <div className="text-sm font-medium">パッケージ一覧のエクスポート / インポート</div>
          <div className={layout.wrapGap2}>
            <button className={action.outlineControl} onClick={onExport} disabled={syncBusy} type="button">
              <Download size={16} />
              エクスポート
            </button>
            <button className={action.outlineControl} onClick={onImport} disabled={syncBusy} type="button">
              <Upload size={16} />
              インポート
            </button>
          </div>
          {syncStatus && <div className={text.mutedXs}>{syncStatus}</div>}
        </div>
      </div>
    </section>
  );
}
