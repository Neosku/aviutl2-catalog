// アプリケーションのルーティング設定
import { Suspense, lazy } from 'react';
import { useTranslation } from 'react-i18next';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import RouterFallback from '@/components/RouterFallback';
import DeepLinkHandler from '@/features/deep-link/ui/DeepLinkHandler';
import AppShell from '@/layouts/app-shell/AppShell';
import { APP_ROUTE_PATHS } from '@/routePaths';
import Home from '@/features/home/ui/HomePage';

const Links = lazy(() => import('@/features/links/ui/LinksPage'));
const Package = lazy(() => import('@/features/package/ui/PackagePage'));
const Updates = lazy(() => import('@/features/updates/ui/UpdatesPage'));
const Settings = lazy(() => import('@/features/settings/ui/SettingsPage'));
const Register = lazy(() => import('@/features/register/ui/RegisterPage'));
const Feedback = lazy(() => import('@/features/feedback/ui/FeedbackPage'));
const NiconiCommons = lazy(() => import('@/features/niconi-commons/ui/NiconiCommonsPage'));

export default function AppRouter() {
  const { t } = useTranslation('common');

  return (
    <BrowserRouter>
      <DeepLinkHandler />
      <Suspense fallback={<div className="p-6">{t('router.loading')}</div>}>
        <Routes>
          <Route element={<AppShell />}>
            <Route path={APP_ROUTE_PATHS.home} element={<Home />} />
            <Route path={APP_ROUTE_PATHS.links} element={<Links />} />
            <Route path={APP_ROUTE_PATHS.updates} element={<Updates />} />
            <Route path={APP_ROUTE_PATHS.settings} element={<Settings />} />
            <Route path={APP_ROUTE_PATHS.register} element={<Register />} />
            <Route path={APP_ROUTE_PATHS.feedback} element={<Feedback />} />
            <Route path={APP_ROUTE_PATHS.niconiCommons} element={<NiconiCommons />} />
            <Route path={APP_ROUTE_PATHS.packageDetail} element={<Package />} />
            <Route path="*" element={<RouterFallback />} />
          </Route>
        </Routes>
      </Suspense>
    </BrowserRouter>
  );
}
