/**
 * バージョン情報コンポーネント
 */
import { memo, useState } from 'react';
import Button from '@/components/ui/Button';
import { ChevronUp, History, Plus } from 'lucide-react';
import type { PackageVersionSectionProps } from '../types';
import VersionItem from './VersionItem';
import { cn } from '@/lib/cn';
import { layout, surface, text } from '@/components/ui/_styles';
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
      <section className={surface.cardSectionSpacious}>
        <div className={layout.rowBetweenWrapGap2}>
          <h2 className={text.titleLg}>バージョン履歴</h2>
          <Button variant="primary" size="xs" type="button" className="shadow-sm" onClick={addVersion}>
            <Plus size={16} />
            <span>新しいバージョンを追加</span>
          </Button>
        </div>
        <div className="space-y-4">
          {!showAll && hiddenCount > 0 && (
            <Button
              variant="plain"
              size="none"
              type="button"
              className="flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-slate-300 bg-slate-50 py-3 text-xs font-semibold text-slate-500 transition hover:border-blue-400 hover:bg-blue-50 hover:text-blue-600 dark:border-slate-700 dark:bg-slate-800/50 dark:text-slate-400 dark:hover:bg-blue-900/20 dark:hover:text-blue-400"
              onClick={() => setShowAll(true)}
            >
              <ChevronUp size={14} />
              <span>以前のバージョン ({hiddenCount}件) を表示</span>
            </Button>
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
            <div className={cn(surface.dashedPlaceholder, 'h-32 text-slate-500 dark:text-slate-400')}>
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
