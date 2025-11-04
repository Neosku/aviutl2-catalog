// パッケージの詳細ページコンポーネント
import React, { useMemo, useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import Header from '../components/Header.jsx';
import ImageCarousel from '../components/ImageCarousel.jsx';
import Icon from '../components/Icon.jsx';
import { useCatalog, useCatalogDispatch } from '../app/store/catalog.jsx';
import { formatDate, hasInstaller, runInstallerForItem, runUninstallerForItem, removeInstalledId, latestVersionOf, loadInstalledMap } from '../app/utils.js';
import { renderMarkdown } from '../app/markdown.js';
import ErrorDialog from '../components/ErrorDialog.jsx';
import ProgressCircle from '../components/ProgressCircle.jsx';

// パスがmdファイルパスかどうか判定
function isMarkdownFilePath(path) {
  if (typeof path !== 'string') return false;
  const trimmedPath = path.trim();
  if (!trimmedPath || trimmedPath.includes('\n')) return false;
  return /\.md$/i.test(trimmedPath);
}

// 相対パスの場合絶対パスに変更
function resolveMarkdownURL(path, baseUrl) {
  const trimmed = String(path || '').trim();
  if (!trimmed) throw new Error('Empty markdown path');
  // 絶対URLならそのまま返す
  try {
    return new URL(trimmed).toString();
  } catch (_) { }
  // 相対URLならbaseUrlを基準に解決
  try {
    return new URL(trimmed, baseUrl).toString();
  } catch (_) { }
  throw new Error('Unable to resolve markdown path');
}

// パッケージ詳細ページコンポーネント
// 指定されたパッケージの詳細情報を表示し、インストール・更新・削除機能を提供
export default function Package() {
  const { id } = useParams();
  const { items } = useCatalog();
  const dispatch = useCatalogDispatch();

  // URLパラメータのIDに基づいてアイテムを検索
  const item = useMemo(() => items.find(i => i.id === id), [items, id]);
  const thumb = item?.images?.[0]?.src;
  const descriptionSource = item?.description || '';

  // UI状態管理（エラー/処理中フラグ）
  const [error, setError] = useState('');
  const [downloading, setDownloading] = useState(false);
  const [updating, setUpdating] = useState(false);
  const [removing, setRemoving] = useState(false);
  const [downloadProgress, setDownloadProgress] = useState(null);
  const [updateProgress, setUpdateProgress] = useState(null);
  const [descriptionHtml, setDescriptionHtml] = useState(() => (
    isMarkdownFilePath(descriptionSource) ? '' : renderMarkdown(descriptionSource)
  ));
  const [descriptionLoading, setDescriptionLoading] = useState(false);
  const [descriptionError, setDescriptionError] = useState('');

  const baseURL = "https://raw.githubusercontent.com/Neosku/aviutl2-catalog-data/main/md/"
  // MarkdownファイルのベースURL（相対パス解決用）
  useEffect(() => {
    let cancelled = false;
    const raw = descriptionSource;
    if (!raw) {
      setDescriptionHtml('');
      setDescriptionError('');
      setDescriptionLoading(false);
      return undefined;
    }
    // Markdownファイルパスでなければそのままレンダリング
    if (!isMarkdownFilePath(raw)) {
      setDescriptionHtml(renderMarkdown(raw));
      setDescriptionError('');
      setDescriptionLoading(false);
      return undefined;
    }
    setDescriptionLoading(true);
    setDescriptionError('');
    setDescriptionHtml('');
    // Markdownファイルをフェッチしてレンダリング
    (async () => {
      try {
        const url = resolveMarkdownURL(raw, baseURL);
        const res = await fetch(url);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const text = await res.text();
        if (!cancelled) {
          setDescriptionHtml(renderMarkdown(text));
        }
      } catch (_) {
        if (!cancelled) {
          setDescriptionHtml(renderMarkdown('詳細説明を読み込めませんでした。'));
          setDescriptionError('詳細説明を読み込めませんでした。');
        }
      } finally {
        if (!cancelled) {
          setDescriptionLoading(false);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [descriptionSource, baseURL]);

  // インストール可能かどうかの判定
  const canInstall = hasInstaller(item) || !!item.downloadURL;
  const downloadRatio = downloadProgress?.ratio ?? 0;
  const downloadPercent = downloadProgress?.percent ?? Math.round(downloadRatio * 100);
  const downloadLabel = downloadProgress?.label ?? '準備中…';
  const updateRatio = updateProgress?.ratio ?? 0;
  const updatePercent = updateProgress?.percent ?? Math.round(updateRatio * 100);
  const updateLabel = updateProgress?.label ?? '準備中…';

  // アイテムが見つからない場合のエラー表示
  if (!item) {
    return (
      <div>
        <Header />
        <main className="container"><div className="error">パッケージが見つかりませんでした。</div></main>
      </div>
    );
  }

  // ダウンロード/インストール処理
  async function onDownload() {
    try {
      setDownloading(true);
      setDownloadProgress({ ratio: 0, percent: 0, label: '準備中…', phase: 'init' });
      if (hasInstaller(item)) {
        await runInstallerForItem(item, dispatch, setDownloadProgress);
      } else {
        throw new Error('インストールが未実装です');
      }
    } catch (err) {
      setError(`更新に失敗しました\n\n${err?.message || String(err) || '原因不明のエラー'}`);
    } finally {
      setDownloading(false);
      setDownloadProgress(null);
    }
  }

  // 更新処理（最新版で上書きインストール）
  async function onUpdate() {
    try {
      setUpdating(true);
      setUpdateProgress({ ratio: 0, percent: 0, label: '準備中…', phase: 'init' });
      if (hasInstaller(item)) {
        await runInstallerForItem(item, dispatch, setUpdateProgress);
      } else {
        throw new Error('インストールが未実装です');
      }
    } catch (err) {
      setError(`更新に失敗しました\n\n${err?.message || String(err) || '原因不明のエラー'}`);
    } finally {
      setUpdating(false);
      setUpdateProgress(null);
    }
  }

  // 削除処理（アンインストーラがある場合は実行、無い場合は状態のみクリア）
  async function onRemove() {
    try {
      setRemoving(true);
      const hasUninstall = Array.isArray(item?.installer?.uninstall) && item.installer.uninstall.length > 0;
      if (hasInstaller(item) && hasUninstall) {
        await runUninstallerForItem(item, dispatch);
      } else {
        await removeInstalledId(item.id);
        const installedMap = await loadInstalledMap();
        dispatch({ type: 'SET_INSTALLED_MAP', payload: installedMap });
        const detectedMap = await import('../app/utils.js').then(m => m.detectInstalledVersionsMap([item]));
        const detected = String((detectedMap && detectedMap[item.id]) || '');
        dispatch({ type: 'SET_DETECTED_ONE', payload: { id: item.id, version: detected } });
      }
    } catch (err) {
      const msg = (err && (err.message || err.toString())) || '原因不明のエラー';
      setError(`削除に失敗しました\n\n${msg}`);
    } finally {
      setRemoving(false);
      setDownloadProgress(null);
      setUpdateProgress(null);
    }
  }

  // 表示用のフォーマット済み情報を準備
  const updated = item.updatedAt ? formatDate(item.updatedAt) : '?';
  const latest = latestVersionOf(item) || '?';

  return (
    <div>
      <Header />
      <main className="container package__layout">
        <div className="package__main">
          {/* メイン情報エリア（タイトル、概要、スクリーンショット） */}
          <section className={"package__hero" + (thumb ? " has-thumb" : "")} data-type={item.type || ''}>
            {thumb ? <div className="package__hero-bg" style={{ backgroundImage: `url(${thumb})` }} aria-hidden /> : null}
            <div className="package__hero-top">
              <h1 className="package__title">{item.name}</h1>
            </div>
            {item.summary && <p className="package__summary">{item.summary}</p>}
          </section>

          {/* スクリーンショット表示エリア */}
          {item.images?.length ? (
            <section>
              <h2>スクリーンショット</h2>
              <ImageCarousel images={item.images} />
            </section>
          ) : null}

          {/* 基本概要セクション */}
          <section>
            <h2>概要</h2>
            <p>{item.summary || '?'}</p>
          </section>

          {/* 詳細説明セクション */}
          {item.description && (
            <section>
              <h2>詳細説明</h2>
              {descriptionLoading ? (
                <p>詳細説明を読み込み中です…</p>
              ) : (
                <div className="md" dangerouslySetInnerHTML={{ __html: descriptionHtml }} />
              )}
              {descriptionError ? (
                <p className="error" role="alert">{descriptionError}</p>
              ) : null}
            </section>
          )}

          {/* その他の情報セクション */}
          <section className="package__extra">
            {item.dependencies?.length ? (
              <div><strong>依存関係:</strong> {item.dependencies.join(', ')}</div>
            ) : null}
          </section>
        </div>

        {/* サイドバー（パッケージのメタ情報とアクションボタン） */}
        <aside className="package__aside">
          <div className="sidecard">
            {/* パッケージのメタ情報表示 */}
            <div className="sideitem"><span className="sideitem__label">分類</span><span className="sideitem__value">{item.type || '?'}</span></div>
            {item.tags?.length ? (
              <div className="sideitem"><span className="sideitem__label">タグ</span>
                <div className="sidelist">
                  {item.tags.map(t => <span key={t} className="sidelist__tag">{t}</span>)}
                </div>
              </div>
            ) : null}
            <div className="sideitem"><span className="sideitem__label">作者</span><span className="sideitem__value">{item.author || '?'}</span></div>
            <div className="sideitem"><span className="sideitem__label">更新日</span><span className="sideitem__value">{updated}</span></div>
            <div className="sideitem"><span className="sideitem__label">最新バージョン</span><span className="sideitem__value">{latest}</span></div>
            <div className="sideitem"><span className="sideitem__label">現在のバージョン</span><span className="sideitem__value">{item.installedVersion || '未インストール'}</span></div>
            <div className="sideitem"><span className="sideitem__label">ライセンス</span><span className="sideitem__value">{item.license || '?'}</span></div>
            {item.repoURL ? (
              <div className="sideitem"><span className="sideitem__label">リポジトリ</span><a className="sideitem__value link" href={item.repoURL} target="_blank" rel="noopener noreferrer"><span aria-hidden><Icon name="open_in_new" size={16} /></span> {item.repoURL}</a></div>
            ) : null}
            {/* アクションボタンエリア（インストール・更新・削除） */}
            <div className="sideactions">
              {item.installed ? (
                <>
                  {item.isLatest ? (
                    <div className="sideactions__status" aria-live="polite">
                      <span className="pill pill--ok pill--block sideactions__btn"><Icon name="check_circle" size={18} />最新{item.installedVersion ? `（${item.installedVersion}）` : ''}</span>
                    </div>
                  ) : (
                    <button className="btn btn--primary sideactions__btn" onClick={onUpdate} disabled={!canInstall || updating}>
                      {updating ? (
                        <span className="action-progress" aria-live="polite">
                          <ProgressCircle value={updateRatio} size={20} strokeWidth={3} ariaLabel={`${updateLabel} ${updatePercent}%`} />
                          <span className="action-progress__label">{updateLabel} {`${updatePercent}%`}</span>
                        </span>
                      ) : (
                        <>
                          <Icon name="refresh" size={18} /> 更新
                        </>
                      )}
                    </button>
                  )}
                  <button className="btn btn--danger sideactions__btn" onClick={onRemove} disabled={removing}>{removing ? (<><span className="spinner" aria-hidden></span> 削除中…</>) : (<><Icon name="delete" size={18} /> 削除</>)}</button>
                </>
              ) : (
                <button className="btn btn--primary sideactions__btn" onClick={onDownload} disabled={!canInstall || downloading}>
                  {downloading ? (
                    <span className="action-progress" aria-live="polite">
                      <ProgressCircle value={downloadRatio} size={20} strokeWidth={3} ariaLabel={`${downloadLabel} ${downloadPercent}%`} />
                      <span className="action-progress__label">{downloadLabel} {`${downloadPercent}%`}</span>
                    </span>
                  ) : (
                    <>
                      <span aria-hidden><svg className="icon" width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden><g stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 3v12" /><path d="M8 11l4 4 4-4" /><path d="M4 21h16" /></g></svg></span> インストール
                    </>
                  )}
                </button>
              )}
            </div>
          </div>
        </aside>
      </main>
      {/* エラーダイアログ（インストール/更新/削除時の失敗表示） */}
      <ErrorDialog open={!!error} message={error} onClose={() => setError('')} />
    </div>
  );
}
