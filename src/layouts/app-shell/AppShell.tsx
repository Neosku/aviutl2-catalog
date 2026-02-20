import { Outlet, useOutletContext } from 'react-router-dom';
import ErrorDialog from '../../components/ErrorDialog';
import { SORT_OPTIONS } from './constants';
import AppSidebar from './components/AppSidebar';
import HomeSearchHeader from './components/HomeSearchHeader';
import useAppShellState from './hooks/useAppShellState';
import type { HomeContextValue } from './types';

export { SORT_OPTIONS };

export default function AppShell() {
  const state = useAppShellState();

  return (
    <div className="flex h-full bg-slate-50 dark:bg-slate-950 font-sans text-slate-800 dark:text-slate-100 overflow-hidden">
      <AppSidebar
        isSidebarCollapsed={state.isSidebarCollapsed}
        activePage={state.activePage}
        updateAvailableCount={state.updateAvailableCount}
        onGoHome={state.goHome}
        onGoUpdates={state.goUpdates}
        onGoRegister={state.goRegister}
        onGoNiconiCommons={state.goNiconiCommons}
        onGoFeedback={state.goFeedback}
        onGoSettings={state.goSettings}
        onOpenDataDir={state.openDataDir}
        onLaunchAviUtl2={state.launchAviUtl2}
        onToggleSidebar={state.toggleSidebar}
      />

      <main className="flex-1 flex flex-col min-w-0 bg-slate-50 dark:bg-slate-950">
        {state.isHome ? (
          <HomeSearchHeader searchQuery={state.searchQuery} onSearchQueryChange={state.setSearchQuery} />
        ) : null}

        <div
          ref={state.scrollContainerRef}
          className={`flex-1 overflow-y-auto scroll-smooth px-6 [scrollbar-gutter:stable] ${
            state.activePage === 'home' ? 'pt-0 pb-6' : state.activePage === 'register' ? 'pt-0 pb-0' : 'pt-6 pb-6'
          }`}
        >
          <Outlet context={state.outletContext} />
        </div>
      </main>

      <ErrorDialog open={Boolean(state.error)} message={state.error} onClose={() => state.setError('')} />
    </div>
  );
}

export function useHomeContext(): HomeContextValue {
  return useOutletContext<HomeContextValue>();
}
