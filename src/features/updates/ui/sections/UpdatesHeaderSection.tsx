import type { UpdatesHeaderSectionProps } from '../types';

export default function UpdatesHeaderSection({
  bulkUpdating,
  hasAnyItemUpdating,
  updatableCount,
  onBulkUpdate,
}: UpdatesHeaderSectionProps) {
  return (
    <div className="flex flex-wrap justify-between items-end gap-4 mb-6">
      <div>
        <h2 className="text-xl font-bold mb-1">アップデートセンター</h2>
        <p className="text-sm text-slate-500 dark:text-slate-400">更新可能なパッケージを確認します</p>
      </div>
      <button
        className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 shadow-lg transition-all text-sm font-bold cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
        onClick={onBulkUpdate}
        disabled={bulkUpdating || hasAnyItemUpdating || updatableCount === 0}
        type="button"
      >
        すべて更新
      </button>
    </div>
  );
}
