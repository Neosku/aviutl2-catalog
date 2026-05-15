import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import ErrorDialog from '@/components/ErrorDialog';
import useUpdatesPage from './hooks/useUpdatesPage';
import useUpdatesChangelog from './hooks/useUpdatesChangelog';
import { BulkProgressSection, UpdatesHeaderSection, UpdatesTableSection } from './sections';
import { page, text } from '@/components/ui/_styles';
import { cn } from '@/lib/cn';

export default function UpdatesPage() {
  const { t } = useTranslation('updates');
  const {
    activeUpdatableItems,
    pausedUpdatableItems,
    pausedPackageUpdatesLoaded,
    bulkUpdatableCount,
    bulkUpdating,
    hasAnyItemUpdating,
    bulkProgress,
    bulkPercent,
    itemProgress,
    pausedPackageIdSet,
    pauseBusyIdSet,
    error,
    setError,
    handleBulkUpdate,
    handleUpdate,
    handleTogglePause,
    handleRemove,
  } = useUpdatesPage();

  const progressStyle = useMemo(() => ({ width: `${bulkPercent}%` }), [bulkPercent]);
  const changelogItems = useMemo(
    () => [
      ...activeUpdatableItems,
      ...pausedUpdatableItems.filter((item) => !activeUpdatableItems.some((active) => active.id === item.id)),
    ],
    [activeUpdatableItems, pausedUpdatableItems],
  );
  const changelogEntries = useUpdatesChangelog(changelogItems);

  return (
    <>
      <div className={cn(page.container4xl, page.selectNone)}>
        <UpdatesHeaderSection
          bulkUpdating={bulkUpdating}
          hasAnyItemUpdating={hasAnyItemUpdating}
          updatableCount={bulkUpdatableCount}
          onBulkUpdate={handleBulkUpdate}
        />

        {bulkUpdating && bulkProgress ? (
          <BulkProgressSection bulkProgress={bulkProgress} bulkPercent={bulkPercent} progressStyle={progressStyle} />
        ) : null}

        <div className="space-y-3">
          <h3 className={text.headingSmBold}>{t('sections.available')}</h3>
          <UpdatesTableSection
            items={activeUpdatableItems}
            emptyMessage={pausedPackageUpdatesLoaded ? t('empty.available') : t('empty.loadingPaused')}
            itemProgress={itemProgress}
            bulkUpdating={bulkUpdating || !pausedPackageUpdatesLoaded}
            pausedPackageIds={pausedPackageIdSet}
            pauseBusyIds={pauseBusyIdSet}
            changelogEntries={changelogEntries}
            onUpdate={handleUpdate}
            onTogglePause={handleTogglePause}
            onRemove={handleRemove}
          />
        </div>

        {pausedUpdatableItems.length > 0 ? (
          <div className="mt-6 space-y-3">
            <h3 className={text.headingSmBold}>{t('sections.paused')}</h3>
            <UpdatesTableSection
              items={pausedUpdatableItems}
              emptyMessage={t('empty.paused')}
              itemProgress={itemProgress}
              bulkUpdating={bulkUpdating}
              pausedPackageIds={pausedPackageIdSet}
              pauseBusyIds={pauseBusyIdSet}
              changelogEntries={changelogEntries}
              onUpdate={handleUpdate}
              onTogglePause={handleTogglePause}
              onRemove={handleRemove}
            />
          </div>
        ) : null}
      </div>
      <ErrorDialog open={Boolean(error)} message={error} onClose={() => setError('')} />
    </>
  );
}
