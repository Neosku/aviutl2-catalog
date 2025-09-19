// アプリケーションのルーティング設定
import React, { Suspense, lazy } from 'react';
import { BrowserRouter, Routes, Route, Link, useLocation } from 'react-router-dom';
import Icon from '../components/Icon.jsx';

// 遅延読み込み（Code Splitting）でページコンポーネントを定義
// const Home = lazy(() => import('../pages/Home.jsx'));
import Home from '../pages/Home.jsx';
const Package = lazy(() => import('../pages/Package.jsx'));
const Submit = lazy(() => import('../pages/Submit.jsx'));

// メインルーターコンポーネント
// アプリケーション全体のルーティングとナビゲーションを管理
export default function AppRouter() {
  return (
    <BrowserRouter>
      <Suspense fallback={<div className="container" style={{ padding: '16px' }}>読み込み中…</div>}>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/package/:id" element={<Package />} />
          <Route path="/submit" element={<Submit />} />
        </Routes>
      </Suspense>
      <FloatingHomeButtonInline />
    </BrowserRouter>
  );
}

// フローティングホームボタンコンポーネント
// ホーム以外のページで表示される固定位置のホームボタン
function FloatingHomeButtonInline() {
  const { pathname } = useLocation();
  // ホームページの場合はボタンを表示しない
  if (pathname === '/') return null;
  return (
    <Link to="/" className="fab fab--home" aria-label="ホームに戻る" title="ホームに戻る">
      <span aria-hidden><Icon name="home" /></span>
      <span>ホームに戻る</span>
    </Link>
  );
}