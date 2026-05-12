import type { PackageSidebarSectionProps } from '../types';
import { PackageSidebarActionsCard, PackageSidebarBackLink, PackageSidebarInfoCard } from './sidebar';

export default function PackageSidebarSection({
  item,
  listLink,
  listLabel,
  listLinkState,
  updated,
  latest,
  originalAuthor,
  packagePageUrl,
  canInstall,
  busyAction,
  isBusy,
  progress,
  hasNotice,
  noticeLoading,
  renderableLicenses,
  licenseTypesLabel,
  onOpenNotice,
  onOpenLicense,
  onDownload,
  onUpdate,
  onRemove,
}: PackageSidebarSectionProps) {
  return (
    <aside className="flex flex-col gap-4 lg:gap-0 h-full">
      <div className="contents lg:block lg:sticky lg:top-6 lg:z-10 lg:space-y-4">
        <PackageSidebarInfoCard
          item={item}
          updated={updated}
          latest={latest}
          originalAuthor={originalAuthor}
          packagePageUrl={packagePageUrl}
          hasNotice={hasNotice}
          noticeLoading={noticeLoading}
          renderableLicenses={renderableLicenses}
          licenseTypesLabel={licenseTypesLabel}
          onOpenNotice={onOpenNotice}
          onOpenLicense={onOpenLicense}
        />
        <PackageSidebarActionsCard
          item={item}
          canInstall={canInstall}
          busyAction={busyAction}
          isBusy={isBusy}
          progress={progress}
          onDownload={onDownload}
          onUpdate={onUpdate}
          onRemove={onRemove}
        />
      </div>
      <PackageSidebarBackLink listLink={listLink} listLabel={listLabel} listLinkState={listLinkState} />
    </aside>
  );
}
