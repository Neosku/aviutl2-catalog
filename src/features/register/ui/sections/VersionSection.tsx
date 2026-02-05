/**
 * バージョン情報コンポーネント
 */
import React, { memo, useState } from 'react';
import { ChevronUp, History, Plus } from 'lucide-react';
import type { PackageVersionSectionProps } from '../types';
import VersionItem from './VersionItem';
const PackageVersionSection = memo(
  function PackageVersionSection({
    versions,
    expandedVersionKeys,
    toggleVersionOpen,
    removeVersion,
    updateVersionField,
    addVersion,
    addVersionFile,
    removeVersionFile,
    updateVersionFile,
    chooseFileForHash,
    openDatePicker,
    versionDateRefs,
  }: PackageVersionSectionProps) {
    const [showAll, setShowAll] = useState(false);
    const hiddenCount = versions.length - 3;
    const visibleVersions = showAll ? versions : versions.slice(Math.max(0, versions.length - 3));

    return (
      <section className="space-y-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-lg font-bold text-slate-800 dark:text-slate-100">バージョン履歴</h2>
          <button
            type="button"
            className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-3 py-2 text-xs font-semibold text-white shadow-sm transition hover:bg-blue-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 dark:bg-blue-600 dark:hover:bg-blue-500"
            onClick={addVersion}
          >
            <Plus size={16} />
            <span>新しいバージョンを追加</span>
          </button>
        </div>
        <div className="space-y-4">
          {!showAll && hiddenCount > 0 && (
            <button
              type="button"
              className="flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-slate-300 bg-slate-50 py-3 text-xs font-semibold text-slate-500 transition hover:border-blue-400 hover:bg-blue-50 hover:text-blue-600 dark:border-slate-700 dark:bg-slate-800/50 dark:text-slate-400 dark:hover:bg-blue-900/20 dark:hover:text-blue-400"
              onClick={() => setShowAll(true)}
            >
              <ChevronUp size={14} />
              <span>以前のバージョン ({hiddenCount}件) を表示</span>
            </button>
          )}
          {visibleVersions.map((ver) => (
            <VersionItem
              key={ver.key}
              version={ver}
              isOpen={expandedVersionKeys.has(ver.key)}
              toggleVersionOpen={toggleVersionOpen}
              removeVersion={removeVersion}
              updateVersionField={updateVersionField}
              addVersionFile={addVersionFile}
              removeVersionFile={removeVersionFile}
              updateVersionFile={updateVersionFile}
              chooseFileForHash={chooseFileForHash}
              openDatePicker={openDatePicker}
              versionDateRefs={versionDateRefs}
            />
          ))}
          {!versions.length && (
            <div className="flex h-32 flex-col items-center justify-center rounded-xl border-2 border-dashed border-slate-200 bg-slate-50 text-slate-500 dark:border-slate-800 dark:bg-slate-800/50 dark:text-slate-400">
              <History size={32} className="mb-2 opacity-50" />
              <p className="text-sm font-medium">バージョン情報がありません</p>
              <p className="text-xs opacity-70">右上のボタンから追加してください</p>
            </div>
          )}
        </div>
      </section>
    );
  },
  (prev: Readonly<PackageVersionSectionProps>, next: Readonly<PackageVersionSectionProps>) =>
    prev.versions === next.versions &&
    prev.expandedVersionKeys === next.expandedVersionKeys &&
    prev.toggleVersionOpen === next.toggleVersionOpen &&
    prev.removeVersion === next.removeVersion &&
    prev.updateVersionField === next.updateVersionField &&
    prev.addVersion === next.addVersion &&
    prev.addVersionFile === next.addVersionFile &&
    prev.removeVersionFile === next.removeVersionFile &&
    prev.updateVersionFile === next.updateVersionFile &&
    prev.chooseFileForHash === next.chooseFileForHash &&
    prev.openDatePicker === next.openDatePicker &&
    prev.versionDateRefs === next.versionDateRefs,
);

export default PackageVersionSection;
