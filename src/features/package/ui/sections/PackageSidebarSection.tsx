import React from 'react';
import type { PackageSidebarSectionProps } from '../types';
import { PackageSidebarActionsCard, PackageSidebarBackLink, PackageSidebarInfoCard } from './sidebar';

export default function PackageSidebarSection({
  item,
  listLink,
  listSearch,
  updated,
  latest,
  canInstall,
  busyAction,
  isBusy,
  progress,
  renderableLicenses,
  licenseTypesLabel,
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
          listSearch={listSearch}
          updated={updated}
          latest={latest}
          renderableLicenses={renderableLicenses}
          licenseTypesLabel={licenseTypesLabel}
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
      <PackageSidebarBackLink listLink={listLink} />
    </aside>
  );
}
