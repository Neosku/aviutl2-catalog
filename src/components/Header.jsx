// ヘッダーのコンポーネント
import React, { useEffect, useState } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { invoke } from '@tauri-apps/api/core';
import SettingsDialog from './SettingsDialog.jsx';
import appIcon from '../../src-tauri/icons/icon.png';
import Icon from './Icon.jsx';
import ErrorDialog from './ErrorDialog.jsx';

export default function Header() {
  const location = useLocation();
  const [q, setQ] = useState(() => new URLSearchParams(location.search).get('q') || '');
  const navigate = useNavigate();
  const [showSettings, setShowSettings] = useState(false);
  const [error, setError] = useState('');
  const showSearch = location.pathname === '/';

  // URLの検索クエリ変更時に入力欄も同期
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    setQ(params.get('q') || '');
  }, [location.search]);

  // 入力に応じて ?q=... を更新（空なら削除・同値なら遷移しない）
  function updateQuery(next, replace = true) {
    const params = new URLSearchParams(location.search);
    const trimmed = next.trim();
    const current = params.get('q') || '';
    if (!trimmed) {
      if (!current) return;
      params.delete('q');
    } else {
      if (current === trimmed) return;
      params.set('q', trimmed);
    }
    const qs = params.toString();
    navigate(`${location.pathname}${qs ? `?${qs}` : ''}`, { replace });
  }

  function onSubmit(e) {
    e.preventDefault();
    updateQuery(q, false);
  }

  function onChange(e) {
    const next = e.target.value;
    setQ(next);
    updateQuery(next);
  }

  function clearQuery() {
    setQ('');
    updateQuery('');
  }

  async function openDataDir() {
    try {
      const dirs = await invoke('get_app_dirs');
      const target = (dirs && typeof dirs.aviutl2_data === 'string') ? dirs.aviutl2_data.trim() : '';
      if (!target) {
        setError('データフォルダの場所を取得できませんでした。設定画面で AviUtl2 のフォルダを確認してください。');
        return;
      }
      const shell = await import('@tauri-apps/plugin-shell');
      if (shell?.Command?.create) {
        const cmd = shell.Command.create('explorer', [target]);
        await cmd.execute();
        return;
      }
      setError('エクスプローラーを起動できませんでした。');
    } catch (e) {
      console.error('[header] failed to open data dir', e);
      setError('データフォルダを開けませんでした。設定を確認してください。');
    }
  }

  return (
    <>
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
          {showSearch && (
            <form className="searchbar" onSubmit={onSubmit} role="search">
              <input
                type="search"
                placeholder="パッケージ名、作者、キーワードで検索"
                value={q}
                onChange={onChange}
                aria-label="検索"
              />
              {q && (
                <button
                  type="button"
                  className="searchbar__clear"
                  onClick={clearQuery}
                  aria-label="検索キーワードをクリア"
                >
                  <Icon name="close" size={18} strokeWidth={2.25} />
                </button>
              )}
              {/* 検索ボタン */}
              <button className="searchbar__btn" type="submit" aria-label="検索">
                <Icon name="search" size={18} />
              </button>
            </form>
          )}
          <div className="header__actions">
            <button
              type="button"
              className="btn btn--icon btn--ghost header__folder-btn"
              onClick={openDataDir}
              aria-label="データフォルダを開く"
              title="データフォルダを開く"
            >
              <Icon name="folder_open"/>
            </button>
            {/* フィードバック */}
            <Link to="/submit" className="btn btn--ghost" title="フィードバック">
              <span aria-hidden><Icon name="feedback" size={20} /></span>
              フィードバック
            </Link>
            {/* 設定ボタン */}
            <button className="btn" type="button" onClick={() => setShowSettings(true)} title="設定"><span aria-hidden><Icon name="settings" /></span> 設定</button>
          </div>
        </div>
        <SettingsDialog open={showSettings} onClose={() => setShowSettings(false)} />
      </header>
      <ErrorDialog open={!!error} message={error} onClose={() => setError('')} />
    </>
  );
}
