import { useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import AppRouter from './Router';
import TitleBar from './layouts/app-shell/title-bar/TitleBar';
import UpdateDialog from './features/app-update/UpdateDialog';
import { CatalogProvider, useCatalogDispatch, initCatalog } from './utils/catalogStore';
import { useUpdatePrompt } from './features/app-update/useUpdatePrompt';
import InitSetupPage from './features/init-setup/ui/InitSetupPage';
import { useGlobalGuards } from './bootstrap/useGlobalGuards';
import { useCatalogBootstrap } from './bootstrap/useCatalogBootstrap';
import { applyBootThemeInitClass, detectWindowLabel, scheduleMainWindowReveal, type AppMode } from './bootstrap/window';
// eslint-disable-next-line import/no-unassigned-import
import './styles/index.css';

applyBootThemeInitClass();
scheduleMainWindowReveal();

function Bootstrapper() {
  const dispatch = useCatalogDispatch();
  const { updateInfo, updateBusy, updateError, confirmUpdate, dismissUpdate } = useUpdatePrompt();

  useGlobalGuards();
  useCatalogBootstrap(dispatch);

  return (
    <>
      <AppRouter />
      <UpdateDialog
        open={!!updateInfo}
        version={updateInfo?.version || ''}
        notes={updateInfo?.notes || ''}
        publishedOn={updateInfo?.publishedOn || ''}
        busy={updateBusy}
        error={updateError}
        onConfirm={confirmUpdate}
        onCancel={dismissUpdate}
      />
    </>
  );
}

function App() {
  return (
    <>
      <TitleBar />
      <div className="app-scroll">
        <CatalogProvider init={initCatalog()}>
          <Bootstrapper />
        </CatalogProvider>
      </div>
    </>
  );
}

function RootApp() {
  const [mode, setMode] = useState<AppMode>('loading');

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const label = await detectWindowLabel();
      if (!cancelled) setMode(label === 'init-setup' ? 'init' : 'main');
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  if (mode === 'loading') {
    return null;
  }
  if (mode === 'init') {
    return <InitSetupPage />;
  }
  return <App />;
}

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error('Root element "#root" was not found.');
}
const root = createRoot(rootElement);
root.render(<RootApp />);
