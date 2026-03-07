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
        installStatus={state.installStatus}
        selectedTags={state.selectedTags}
        sortedSelectedTags={state.sortedSelectedTags}
        sortedAllTags={state.sortedAllTags}
        isFilterExpanded={state.isFilterExpanded}
        isInstallMenuOpen={state.isInstallMenuOpen}
        isSortMenuOpen={state.isSortMenuOpen}
        sortOrder={state.sortOrder}
        onCategoryChange={state.setCategory}
        onToggleInstallMenu={state.toggleInstallMenu}
        onCloseInstallMenu={state.closeInstallMenu}
        onSelectInstallStatus={state.selectInstallStatus}
        onToggleFilterExpanded={state.toggleFilterExpanded}
        onToggleSortMenu={state.toggleSortMenu}
        onCloseSortMenu={state.closeSortMenu}
        onSelectSortOrder={state.selectSortOrder}
        onToggleTag={state.toggleTag}
        onClearTags={state.clearTags}
      />

      {filteredCount > 0 ? (
        <PackageGridSection
          filteredPackages={state.filteredPackages}
          listSearch={state.listSearch}
          onBeforeOpenDetail={state.saveHomeScrollPosition}
        />
      ) : (
        <EmptyStateSection onClearConditions={state.clearConditions} />
      )}
    </div>
  );
}
