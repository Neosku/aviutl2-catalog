import { useLayoutEffect } from 'react';
import { createRoot } from 'react-dom/client';
import { I18nextProvider } from 'react-i18next';
import AppRouter from '@/Router';
import { useCatalogBootstrap } from '@/bootstrap/useCatalogBootstrap';
import { useGlobalGuards } from '@/bootstrap/useGlobalGuards';
import { applyBootThemeInitClass, getWindowMode, showCurrentWindow } from '@/bootstrap/window';
import UpdateDialog from '@/features/app-update/UpdateDialog';
import { useUpdatePrompt } from '@/features/app-update/useUpdatePrompt';
import InitSetupPage from '@/features/init-setup/ui/InitSetupPage';
import { i18n, initializeI18n } from '@/i18n';
import TitleBar from '@/layouts/app-shell/title-bar/TitleBar';
import { CatalogProvider, useCatalogDispatch, initCatalog } from '@/utils/catalogStore';
// eslint-disable-next-line import/no-unassigned-import
import '@/styles/index.css';

applyBootThemeInitClass();

function CatalogBootstrapLoader() {
  const dispatch = useCatalogDispatch();
  useCatalogBootstrap(dispatch);
  return null;
}

function Bootstrapper() {
  const { updateInfo, updateBusy, updateError, confirmUpdate, dismissUpdate } = useUpdatePrompt();

  useGlobalGuards();

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
        <Bootstrapper />
      </div>
    </>
  );
}

function RootApp() {
  const mode = getWindowMode();

  useLayoutEffect(() => {
    const frame = requestAnimationFrame(() => {
      void showCurrentWindow();
    });
    return () => cancelAnimationFrame(frame);
  }, []);

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

void initializeI18n().finally(() => {
  root.render(
    <I18nextProvider i18n={i18n}>
      <CatalogProvider init={initCatalog()}>
        <CatalogBootstrapLoader />
        <RootApp />
      </CatalogProvider>
    </I18nextProvider>,
  );
});
