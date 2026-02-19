import useHomePage from './hooks/useHomePage';
import { EmptyStateSection, FiltersSection, PackageGridSection } from './sections';

export default function HomePage() {
  const state = useHomePage();
  const filteredCount = state.filteredPackages.length;

  return (
    <div className="flex flex-col min-h-full select-none">
      <FiltersSection
        categories={state.categories}
        selectedCategory={state.selectedCategory}
        filteredCount={filteredCount}
        filterInstalled={state.filterInstalled}
        selectedTags={state.selectedTags}
        sortedSelectedTags={state.sortedSelectedTags}
        sortedAllTags={state.sortedAllTags}
        isFilterExpanded={state.isFilterExpanded}
        isSortMenuOpen={state.isSortMenuOpen}
        sortOrder={state.sortOrder}
        sortOptions={state.sortOptions}
        onCategoryChange={state.setCategory}
        onToggleInstalled={state.toggleInstalledFilter}
        onToggleFilterExpanded={state.toggleFilterExpanded}
        onToggleSortMenu={state.toggleSortMenu}
        onCloseSortMenu={state.closeSortMenu}
        onSelectSortOrder={state.selectSortOrder}
        onToggleTag={state.toggleTag}
        onClearTags={state.clearTags}
      />

      {filteredCount > 0 ? (
        <PackageGridSection filteredPackages={state.filteredPackages} listSearch={state.listSearch} />
      ) : (
        <EmptyStateSection onClearConditions={state.clearConditions} />
      )}
    </div>
  );
}
