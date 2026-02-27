import { useMemo } from 'react';
import ErrorDialog from '../../../components/ErrorDialog';
import useUpdatesPage from './hooks/useUpdatesPage';
import { BulkProgressSection, UpdatesHeaderSection, UpdatesTableSection } from './sections';
import { page } from '@/components/ui/_styles';
import { cn } from '@/lib/cn';

export default function UpdatesPage() {
  const {
    updatableItems,
    bulkUpdating,
    hasAnyItemUpdating,
    bulkProgress,
    bulkPercent,
    itemProgress,
    error,
    setError,
    handleBulkUpdate,
    handleUpdate,
  } = useUpdatesPage();

  const progressStyle = useMemo(() => ({ width: `${bulkPercent}%` }), [bulkPercent]);

  return (
    <>
      <div className={cn(page.container3xl, page.selectNone)}>
        <UpdatesHeaderSection
          bulkUpdating={bulkUpdating}
          hasAnyItemUpdating={hasAnyItemUpdating}
          updatableCount={updatableItems.length}
          onBulkUpdate={handleBulkUpdate}
        />

        {bulkUpdating && bulkProgress ? (
          <BulkProgressSection bulkProgress={bulkProgress} bulkPercent={bulkPercent} progressStyle={progressStyle} />
        ) : null}

        <UpdatesTableSection
          updatableItems={updatableItems}
          itemProgress={itemProgress}
          bulkUpdating={bulkUpdating}
          onUpdate={handleUpdate}
        />
      </div>
      <ErrorDialog open={Boolean(error)} message={error} onClose={() => setError('')} />
    </>
  );
}
