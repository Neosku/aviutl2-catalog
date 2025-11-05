// メインページコンポーネント
import React, { useMemo, useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import Header from '../components/Header.jsx';
import SortBar from '../components/SortBar.jsx';
import PluginCard from '../components/PluginCard.jsx';
import FilterPanel from '../components/FilterPanel.jsx';
import ProgressCircle from '../components/ProgressCircle.jsx';
import ErrorDialog from '../components/ErrorDialog.jsx';
import Icon from '../components/Icon.jsx';
import { useCatalog, useCatalogDispatch } from '../app/store/catalog.jsx';
import { getSorter, filterByTagsAndType, matchQuery, logError, hasInstaller, runInstallerForItem } from '../app/utils.js';

// メインページコンポーネント
// プラグイン一覧の表示、検索、フィルタリング、ソート機能を提供
export default function Home() {
  const { items, loading, error } = useCatalog();
  const dispatch = useCatalogDispatch();
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
  const [bulkUpdating, setBulkUpdating] = useState(false);
  const [bulkError, setBulkError] = useState('');
  const [bulkProgress, setBulkProgress] = useState(null);
  const bulkRatio = bulkProgress?.ratio ?? 0;
  const bulkPercent = bulkProgress?.percent ?? Math.round(bulkRatio * 100);
  const bulkLabel = bulkProgress?.label ?? '更新処理中…';
  const bulkCurrent = bulkProgress?.current ?? 0;

  // 更新対象: インストール済みかつ最新版でないプラグインのみ抽出
  const updatableItems = useMemo(() => {
    return items.filter(it => it.installed && !it.isLatest && hasInstaller(it));
  }, [items]);

  const bulkTotal = bulkProgress?.total ?? (bulkUpdating ? (updatableItems.length || 0) : 0);

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

  // 更新があるプラグインをまとめてインストール処理
  async function handleBulkUpdate() {
    if (bulkUpdating || !updatableItems.length) return;
    setBulkUpdating(true);
    setBulkError('');
    setBulkProgress({ ratio: 0, percent: 0, label: '準備中…', current: 0, total: updatableItems.length });
    const targets = updatableItems.slice();
    const total = targets.length || 1;
    const failed = [];
    for (let i = 0; i < targets.length; i++) {
      const item = targets[i];
      try {
        await runInstallerForItem(item, dispatch, (progress) => {
          const stepRatio = progress && Number.isFinite(progress.ratio) ? Math.min(1, Math.max(0, progress.ratio)) : 0;
          const overall = Math.min(1, Math.max(0, (i + stepRatio) / total));
          const percent = Math.round(overall * 100);
          const label = progress?.label || '処理中…';
          setBulkProgress({
            ratio: overall,
            percent,
            label: `${item.name} - ${label}`,
            current: i + 1,
            total,
          });
        });
        const overall = Math.min(1, Math.max(0, (i + 1) / total));
        setBulkProgress({
          ratio: overall,
          percent: Math.round(overall * 100),
          label: `${item.name} - 完了`,
          current: i + 1,
          total,
        });
      } catch (err) {
        const msg = err?.message || String(err) || '不明なエラー';
        failed.push({ item, msg });
        try { await logError(`[BulkUpdate] ${item.id}: ${msg}`); } catch (_) { /* ignore */ }
        const overall = Math.min(1, Math.max(0, (i + 1) / total));
        setBulkProgress({
          ratio: overall,
          percent: Math.round(overall * 100),
          label: `${item.name} - エラー`,
          current: i + 1,
          total,
        });
      }
    }

    if (failed.length) {
      const example = failed[0];
      setBulkError(`${failed.length}件のプラグインで更新に失敗しました（例: ${example.item.name}: ${example.msg}）`);
    }
    setBulkProgress(null);
    setBulkUpdating(false);
  }

  return (
    <div className="route-home">
      <Header />
      <div className="route-home__body">
        <div className="sortbar-container container">
          <SortBar value={sortKey} />
          <div className="bulk-card-container" aria-live="polite">
            <div className="bulk-card">
              <div className="bulk-card__main">
                <div className="bulk-card__header">
                  <span className="bulk-card__title">まとめて更新</span>
                  <span className="bulk-card__count" aria-label={`対象 ${updatableItems.length}件`}>
                    <span className="bulk-card__count-number">{updatableItems.length}</span>
                    <span className="bulk-card__count-suffix">件</span>
                  </span>
                </div>
              </div>
              <button
                className="bulk-card__button"
                onClick={handleBulkUpdate}
                disabled={bulkUpdating || !updatableItems.length}
              >
                {bulkUpdating ? (
                  <span className="bulk-card__progress" aria-live="polite">
                    <ProgressCircle value={bulkRatio} size={28} strokeWidth={3} ariaLabel={`${bulkLabel} ${bulkPercent}%`} />
                    <span className="bulk-card__progress-text">
                      <span className="bulk-card__progress-label">{bulkLabel}</span>
                      <span className="bulk-card__progress-meta">{`${bulkPercent}%`}{bulkTotal ? ` · ${bulkCurrent}/${bulkTotal}` : ''}</span>
                    </span>
                  </span>
                ) : (
                  <>
                    <span className="bulk-card__button-icon" aria-hidden>
                      <Icon name="refresh" size={18} />
                    </span>
                    <span>一括更新</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
        <div className="container layout-two">
          <aside className="route-home__aside">
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
          <main className="route-home__main">
            <div className="route-home__grid grid">
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
                <PluginCard key={it.id} item={it} />
              ))}
            </div>
          </main>
        </div>
      </div>
      <ErrorDialog open={!!bulkError} message={bulkError} onClose={() => setBulkError('')} />
    </div>
  );
}
