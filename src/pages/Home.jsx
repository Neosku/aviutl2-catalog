// メインページコンポーネント
import React, { useMemo, useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import Header from '../components/Header.jsx';
import SortBar from '../components/SortBar.jsx';
import PluginCard from '../components/PluginCard.jsx';
import FilterPanel from '../components/FilterPanel.jsx';
import { useCatalog } from '../app/store/catalog.jsx';
import { getSorter, filterByTagsAndType, matchQuery, logError } from '../app/utils.js';

// メインページコンポーネント
// プラグイン一覧の表示、検索、フィルタリング、ソート機能を提供
export default function Home() {
  const { items, loading, error } = useCatalog();
  const location = useLocation();
  const navigate = useNavigate();
  // URLパラメータから検索・フィルタ条件を取得
  const params = new URLSearchParams(location.search);
  const q = params.get('q') || '';
  const sortKey = params.get('sort') || 'newest';
  const dir = params.get('dir') || (sortKey === 'name' ? 'asc' : 'desc');
  const selectedType = params.get('type') || '';
  const tags = (params.get('tags') || '').split(',').filter(Boolean);
  const types = selectedType ? [selectedType] : [];
  const installedOnly = params.get('installed') === '1';
  
  // Tauri側の検索結果IDリスト
  const [ids, setIds] = useState([]);
  
  // 基本的なフィルタリング処理（検索・タグ・種別）
  const baseList = useMemo(() => {
    if (ids && ids.length) {
      // Tauri側での検索結果がある場合はそのIDに基づいて一覧を生成
      const map = new Map(items.map(it => [it.id, it]));
      return ids.map(id => map.get(id)).filter(Boolean);
    }
    // Fallback: JavaScript側での検索・フィルタリング
    const base = q ? items.filter(it => matchQuery(it, q)) : items;
    return filterByTagsAndType(base, tags, types);
  }, [items, ids.join('|'), q, tags.join(','), types.join(',')]);
  
  // インストール済みのみ表示フィルタ
  const filtered = useMemo(() => {
    return installedOnly ? baseList.filter(it => it.installed) : baseList;
  }, [baseList, installedOnly]);
  
  // ソート処理
  const sorted = useMemo(() => {
    return [...filtered].sort(getSorter(sortKey, dir));
  }, [filtered, sortKey, dir]);

  // Tauri側での検索処理を実行
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const { invoke } = await import('@tauri-apps/api/core');
        const res = await invoke('query_catalog_index', {
          q,
          tags,
          types,
          sort: sortKey,
          dir,
        });
        if (!cancelled && Array.isArray(res)) setIds(res);
      } catch (_) {
        // エラーが発生した場合は空のリストに設定
        if (!cancelled) setIds([]);
      }
    })();
    return () => { cancelled = true; };
  }, [q, tags.join(','), types.join(','), sortKey, dir]);

  // 検索条件をクリアする
  function clearSearch() {
    const p = new URLSearchParams(location.search);
    p.delete('q');
    navigate(`${location.pathname}?${p.toString()}`);
  }

  return (
    <div>
      <Header />
      <SortBar value={sortKey} />
      <div className="container layout-two">
        <aside>
          {/* 検索結果表示エリア */}
          {q ? (
            <div className="sidebar" aria-live="polite">
              <div className="sidebar__group">
                <span className="badge">検索結果: {sorted.length}件</span>
                <button className="chip is-selected" onClick={clearSearch} aria-label="検索ワードをクリア">
                  検索ワード: {q} ×
                </button>
              </div>
            </div>
          ) : null}
          <FilterPanel />
        </aside>
        <main className="grid">
          {/* 読み込み状態とエラー状態の表示 */}
          {loading && <div>読み込み中…</div>}
          {error && <div className="error">{error}</div>}
          {/* 該当結果なしの表示 */}
          {!loading && !sorted.length && (
            <div className="empty">
              <div className="empty__title">該当する結果がありません</div>
            </div>
          )}
          {/* プラグインカード一覧 */}
          {!loading && sorted.map(it => (
            <PluginCard key={it.id} item={it}/>
          ))}
        </main>
      </div>
    </div>
  );
}
