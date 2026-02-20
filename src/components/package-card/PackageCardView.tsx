import { PackageCardActionSection, PackageCardMetaSection, PackageCardThumbnailSection } from './sections';
import type { PackageCardViewProps } from './types';

const cardHeightClass = 'h-52';
const emptyTags: string[] = [];

export default function PackageCardView({
  item,
  thumbnail,
  category,
  lastUpdated,
  isInstalled,
  hasUpdate,
  canInstall,
  downloading,
  updating,
  removing,
  downloadRatio,
  updateRatio,
  onOpenDetail,
  onCardKeyDown,
  onDownload,
  onUpdate,
  onRemove,
}: PackageCardViewProps) {
  const tags = Array.isArray(item.tags) ? item.tags : emptyTags;

  return (
    <div
      className={`group relative flex flex-row ${cardHeightClass} min-w-[480px] bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden hover:shadow-xl hover:shadow-blue-900/5 dark:hover:shadow-black/40 hover:border-blue-300/50 dark:hover:border-slate-600 transition-all duration-300 ease-out cursor-pointer hover:-translate-y-0.5`}
      onClick={onOpenDetail}
      tabIndex={0}
      onKeyDown={onCardKeyDown}
    >
      <div className="flex-1 p-4 flex flex-col min-w-0 relative z-10">
        <PackageCardMetaSection item={item} lastUpdated={lastUpdated} tags={tags} />
        <PackageCardActionSection
          isInstalled={isInstalled}
          hasUpdate={hasUpdate}
          canInstall={canInstall}
          downloading={downloading}
          updating={updating}
          removing={removing}
          downloadRatio={downloadRatio}
          updateRatio={updateRatio}
          installedVersion={item.installedVersion}
          onDownload={onDownload}
          onUpdate={onUpdate}
          onRemove={onRemove}
        />
      </div>

      <PackageCardThumbnailSection thumbnail={thumbnail} itemName={item.name} category={category} />

      <div className="absolute inset-0 rounded-2xl ring-1 ring-inset ring-transparent group-hover:ring-blue-500/20 dark:group-hover:ring-blue-400/20 pointer-events-none transition-all"></div>
    </div>
  );
}
