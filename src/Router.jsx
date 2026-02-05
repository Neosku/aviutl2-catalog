// アプリケーションのルーティング設定
import React, { Suspense, lazy } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import AppShell from './components/AppShell.jsx';
import DeepLinkHandler from './components/DeepLinkHandler.jsx';

import Home from './pages/Home.jsx';
const Package = lazy(() => import('./pages/Package.jsx'));
const Updates = lazy(() => import('./pages/Updates.jsx'));
const Settings = lazy(() => import('./pages/Settings.jsx'));
const Register = lazy(() => import('./features/register/ui/RegisterPage.tsx'));
const Feedback = lazy(() => import('./pages/Feedback.jsx'));
const NiconiCommons = lazy(() => import('./pages/NiconiCommons.jsx'));

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
