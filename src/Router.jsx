// アプリケーションのルーティング設定
import React, { Suspense, lazy } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import AppShell from './components/AppShell.jsx';
import DeepLinkHandler from './components/DeepLinkHandler.jsx';

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
            <Route path="/" element={<Home />} />
            <Route path="/updates" element={<Updates />} />
            <Route path="/settings" element={<Settings />} />
            <Route path="/register" element={<Register />} />
            <Route path="/feedback" element={<Feedback />} />
            <Route path="/niconi-commons" element={<NiconiCommons />} />
            <Route path="/package/:id" element={<Package />} />
          </Route>
        </Routes>
      </Suspense>
    </BrowserRouter>
  );
}
