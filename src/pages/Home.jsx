// メインページコンポーネント
import React, { useMemo, useEffect, useState, useLayoutEffect, useRef } from 'react';
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

let savedHomeScrollTop = 0;
let savedHomeSearch = '';
let restoreHomeSearch = false;

// メインページコンポーネント
// プラグイン一覧の表示、検索、フィルタリング、ソート機能を提供
export default function Home() {
  const { items, loading, error } = useCatalog();
  const dispatch = useCatalogDispatch();
  const location = useLocation();
  const navigate = useNavigate();
  const mainRef = useRef(null);
  const shouldRestoreHome = location.pathname === '/' && !location.search && restoreHomeSearch && savedHomeSearch;
  const effectiveSearch = shouldRestoreHome ? savedHomeSearch : location.search;
  const latestSearchRef = useRef(effectiveSearch);
  const prevSearchRef = useRef(effectiveSearch);
  const pendingScrollRef = useRef(false);
  latestSearchRef.current = effectiveSearch;

  // URLパラメータから検索・フィルタ条件を取得
  const params = new URLSearchParams(effectiveSearch);
  const q = params.get('q') || '';
  const sortKey = params.get('sort') || 'newest';
  const dir = params.get('dir') || (sortKey === 'name' ? 'asc' : 'desc');
  const selectedType = params.get('type') || '';
  const tags = (params.get('tags') || '').split(',').filter(Boolean);
  const types = selectedType ? [selectedType] : [];
  const installedOnly = params.get('installed') === '1';

  const [bulkUpdating, setBulkUpdating] = useState(false);
  const [bulkError, setBulkError] = useState('');
  const [bulkProgress, setBulkProgress] = useState(null);
  const bulkRatio = bulkProgress?.ratio ?? 0;
  const bulkPercent = bulkProgress?.percent ?? Math.round(bulkRatio * 100);
  const bulkLabel = bulkProgress?.label ?? '更新処理中…';
  const bulkCurrent = bulkProgress?.current ?? 0;
  const [showScrollTop, setShowScrollTop] = useState(false);

  // 更新対象: インストール済みかつ最新版でないプラグインのみ抽出
  const updatableItems = useMemo(() => {
    return items.filter(it => it.installed && !it.isLatest && hasInstaller(it));
  }, [items]);

  const bulkTotal = bulkProgress?.total ?? (bulkUpdating ? (updatableItems.length || 0) : 0);

  // スクロール位置の保存と復元
  useLayoutEffect(() => {
    const main = mainRef.current;
    if (main) {
      main.scrollTop = savedHomeScrollTop;
    }
    return () => {
      if (main) {
        savedHomeScrollTop = main.scrollTop;
      }
    };
  }, []);

  // スクロール位置に応じた「先頭に戻る」ボタンの表示制御
  useEffect(() => {
    const main = mainRef.current;
    if (!main) return;
    const handleScroll = () => {
      setShowScrollTop(main.scrollTop > 200);
    };
    handleScroll();
    main.addEventListener('scroll', handleScroll, { passive: true });
    return () => {
      main.removeEventListener('scroll', handleScroll);
    };
  }, []);

  // ホーム内でのクエリ変更時は先頭へ戻す（ページ遷移直後は除外）
  useEffect(() => {
    const prevSearch = prevSearchRef.current;
    if (location.pathname === '/' && prevSearch !== effectiveSearch) {
      pendingScrollRef.current = true;
    }
    prevSearchRef.current = effectiveSearch;
  }, [effectiveSearch, location.pathname]);

  const scrollToTop = () => {
    const main = mainRef.current;
    if (!main) return;
    main.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // 基本的なフィルタリング処理（検索・タグ・種別）
  const baseList = useMemo(() => {
    const base = q ? items.filter(it => matchQuery(it, q)) : items;
    return filterByTagsAndType(base, tags, types);
  }, [items, q, tags.join(','), types.join(',')]);

  // インストール済みのみ表示フィルタ
  const filtered = useMemo(() => {
    return installedOnly ? baseList.filter(it => it.installed) : baseList;
  }, [baseList, installedOnly]);

  // ソート処理
  const sorted = useMemo(() => {
    return [...filtered].sort(getSorter(sortKey, dir));
  }, [filtered, sortKey, dir]);

  // 絞り込み結果の描画が反映された後にスクロールする
  useLayoutEffect(() => {
    if (location.pathname !== '/') return;
    if (!pendingScrollRef.current) return;
    const main = mainRef.current;
    if (!main) return;
    pendingScrollRef.current = false;
    main.scrollTop = 0;
  }, [sorted, location.pathname]);

  // ホームを離れる前のクエリを保存し、戻ったら復元する
  useLayoutEffect(() => {
    if (location.pathname !== '/') return;
    if (shouldRestoreHome) {
      navigate(`${location.pathname}${savedHomeSearch}`, { replace: true });
    }
  }, [location.pathname, navigate, shouldRestoreHome]);

  useEffect(() => {
    if (location.pathname !== '/') return;
    if (restoreHomeSearch && location.search === savedHomeSearch) {
      restoreHomeSearch = false;
    }
  }, [location.pathname, location.search]);

  useEffect(() => {
    return () => {
      restoreHomeSearch = true;
      savedHomeSearch = latestSearchRef.current;
    };
  }, []);

  // Rust側インデックス検索（未使用）（JSのほうが速い）
  // useEffect(() => {
  //   let cancelled = false;
  //   (async () => {
  //     try {
  //       const { invoke } = await import('@tauri-apps/api/core');
  //       const res = await invoke('query_catalog_index', {
  //         q,
  //         tags,
  //         types,
  //         sort: sortKey,
  //         dir,
  //       });
  //       if (!cancelled && Array.isArray(res)) setIds(res);
  //     } catch (_) {
  //       // エラーが発生した場合は空のリストに設定
  //       if (!cancelled) setIds([]);
  //     }
  //   })();
  //   return () => { cancelled = true; };
  // }, [q, tags.join(','), types.join(','), sortKey, dir]);

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
      <Header searchOverride={effectiveSearch || undefined} />
      <div className="route-home__body">
        <div className="sortbar-container container">
          <SortBar value={sortKey} searchOverride={effectiveSearch || undefined} />
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
            <div className="sidebar" aria-live="polite">
              <div className="sidebar__group">
                <span className="badge badge--sidebar">表示件数: {sorted.length}件</span>
              </div>
            </div>
            <FilterPanel searchOverride={effectiveSearch || undefined} />
          </aside>
          <main className="route-home__main" ref={mainRef}>
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
            {showScrollTop && (
              <button
                type="button"
                className="route-home__scrolltop"
                onClick={scrollToTop}
                aria-label="先頭に戻る"
              >
                <Icon name="chevron_up" size={18} />
              </button>
            )}
          </main>
        </div>
      </div>
      <ErrorDialog open={!!bulkError} message={bulkError} onClose={() => setBulkError('')} />
    </div>
  );
}
