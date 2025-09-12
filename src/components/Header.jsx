// ヘッダーのコンポーネント
import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import SettingsDialog from './SettingsDialog.jsx';
import appIcon from '../../src-tauri/icons/icon.png';
import Icon from './Icon.jsx';

export default function Header() {
  const [q, setQ] = useState('');
  const navigate = useNavigate();
  const [showSettings, setShowSettings] = useState(false);

  function onSubmit(e) {
    e.preventDefault();
    const params = new URLSearchParams();
    if (q.trim()) params.set('q', q.trim());
    navigate(`/?${params.toString()}`);
  }

  return (
    <header className="header">
      <div className="container header__inner">
        {/* ロゴ */}
        <Link to="/" className="logo">
          <span className="logo__icon" aria-hidden>
            <img src={appIcon} alt="" />
          </span>
          <span className="logo__text">AviUtl2 カタログ</span>
        </Link>
        {/* 検索フォーム */}
        <form className="searchbar" onSubmit={onSubmit} role="search">
          <input
            type="search"
            placeholder="パッケージ名、作者、キーワードで検索"
            value={q}
            onChange={e => setQ(e.target.value)}
            aria-label="検索"
          />
          {/* 検索ボタン */}
          <button className="searchbar__btn" type="submit" aria-label="検索">
            <Icon name="search" size={18} />
          </button>
        </form>
        {/* 設定ボタン */}
        <button className="btn" type="button" onClick={() => setShowSettings(true)} title="設定"><span aria-hidden><Icon name="settings" /></span> 設定</button>
        {/* フィードバック */}
        <Link to="/submit" className="btn btn--ghost" title="フィードバック">フィードバック</Link>
      </div>
      <SettingsDialog open={showSettings} onClose={() => setShowSettings(false)} />
    </header>
  );
}
