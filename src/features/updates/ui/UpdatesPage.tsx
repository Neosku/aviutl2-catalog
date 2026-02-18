import { useMemo } from 'react';
import ErrorDialog from '../../../components/ErrorDialog.jsx';
import useUpdatesPage from './hooks/useUpdatesPage';
import { BulkProgressSection, UpdatesHeaderSection, UpdatesTableSection } from './sections';

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
      <div className="max-w-3xl mx-auto select-none">
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
