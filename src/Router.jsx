// アプリケーションのルーティング設定
import React, { Suspense, lazy } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import AppShell from './layouts/app-shell/AppShell';
import DeepLinkHandler from './features/deep-link/ui/DeepLinkHandler';
import { APP_ROUTE_PATHS } from './routePaths';

const Home = lazy(() => import('./features/home/ui/HomePage.tsx'));
const Package = lazy(() => import('./features/package/ui/PackagePage.tsx'));
const Updates = lazy(() => import('./features/updates/ui/UpdatesPage.tsx'));
const Settings = lazy(() => import('./features/settings/ui/SettingsPage.tsx'));
const Register = lazy(() => import('./features/register/ui/RegisterPage.tsx'));
const Feedback = lazy(() => import('./features/feedback/ui/FeedbackPage.tsx'));
const NiconiCommons = lazy(() => import('./features/niconi-commons/ui/NiconiCommonsPage.tsx'));

export default function AppRouter() {
  return (
    <BrowserRouter>
      <DeepLinkHandler />
      <Suspense fallback={<div className="p-6">読み込み中…</div>}>
        <Routes>
          <Route element={<AppShell />}>
            <Route path={APP_ROUTE_PATHS.home} element={<Home />} />
            <Route path={APP_ROUTE_PATHS.updates} element={<Updates />} />
            <Route path={APP_ROUTE_PATHS.settings} element={<Settings />} />
            <Route path={APP_ROUTE_PATHS.register} element={<Register />} />
            <Route path={APP_ROUTE_PATHS.feedback} element={<Feedback />} />
            <Route path={APP_ROUTE_PATHS.niconiCommons} element={<NiconiCommons />} />
            <Route path={APP_ROUTE_PATHS.packageDetail} element={<Package />} />
          </Route>
        </Routes>
      </Suspense>
    </BrowserRouter>
  );
}
