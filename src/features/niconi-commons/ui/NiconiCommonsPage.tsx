import useNiconiCommonsPage from './hooks/useNiconiCommonsPage';
import { GuideSection, HeaderSection, TableSection, ToolbarSection } from './sections';

export default function NiconiCommonsPage() {
  const {
    copyState,
    query,
    setQuery,
    filteredItems,
    selectedMap,
    selectedCount,
    totalEligible,
    visibleCount,
    allVisibleSelected,
    toggleAllVisible,
    toggleItem,
    onCopySelected,
    onCopyCommonsId,
    onOpenGuide,
  } = useNiconiCommonsPage();

  return (
    <div className="max-w-4xl mx-auto select-none">
      <HeaderSection copyState={copyState} selectedCount={selectedCount} onCopySelected={onCopySelected} />

      <GuideSection onOpenGuide={onOpenGuide} />

      <ToolbarSection
        visibleCount={visibleCount}
        selectedCount={selectedCount}
        query={query}
        onQueryChange={setQuery}
      />

      <TableSection
        visibleCount={visibleCount}
        totalEligible={totalEligible}
        filteredItems={filteredItems}
        allVisibleSelected={allVisibleSelected}
        selectedMap={selectedMap}
        onToggleAllVisible={toggleAllVisible}
        onToggleItem={toggleItem}
        onCopyCommonsId={onCopyCommonsId}
      />
    </div>
  );
}
