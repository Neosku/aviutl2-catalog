// パッケージの詳細ページコンポーネント
import React, { useMemo, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import Header from '../components/Header.jsx';
import ImageCarousel from '../components/ImageCarousel.jsx';
import Icon from '../components/Icon.jsx';
import { useCatalog, useCatalogDispatch } from '../app/store/catalog.jsx';
import { formatDate, hasInstaller, runInstallerForItem, runUninstallerForItem, removeInstalledId, latestVersionOf, loadInstalledMap } from '../app/utils.js';
import { renderMarkdown } from '../app/markdown.js';
import ErrorDialog from '../components/ErrorDialog.jsx';

// パッケージ詳細ページコンポーネント
// 指定されたパッケージの詳細情報を表示し、インストール・更新・削除機能を提供
export default function Package() {
  const { id } = useParams();
  const { items } = useCatalog();
  const dispatch = useCatalogDispatch();
  
  // URLパラメータのIDに基づいてアイテムを検索
  const item = useMemo(() => items.find(i => i.id === id), [items, id]);
  const thumb = item?.images?.[0]?.src;
  
  // UI状態管理（エラー/処理中フラグ）
  const [error, setError] = useState('');
  const [downloading, setDownloading] = useState(false);
  const [updating, setUpdating] = useState(false);
  const [removing, setRemoving] = useState(false);
  
  // インストール可能かどうかの判定
  const canInstall = hasInstaller(item) || !!item.downloadURL;

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
      if (hasInstaller(item)) {
        await runInstallerForItem(item, dispatch);
      } else {
        throw new Error('インストールが未実装です');
      }
    } catch (err) {
      setError(`更新に失敗しました\n\n${err?.message || String(err) || '原因不明のエラー'}`);
    } finally {
      setDownloading(false);
    }
  }

  // 更新処理（最新版で上書きインストール）
  async function onUpdate() {
    try {
      setUpdating(true);
      if (hasInstaller(item)) {
        await runInstallerForItem(item, dispatch);
      } else {
        throw new Error('インストールが未実装です');
      }
    } catch (err) {
      setError(`更新に失敗しました\n\n${err?.message || String(err) || '原因不明のエラー'}`);
    } finally { setUpdating(false); }
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
    } finally { setRemoving(false); }
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
              <div className="md" dangerouslySetInnerHTML={{ __html: renderMarkdown(item.description) }} />
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
                    <button className="btn btn--primary sideactions__btn" onClick={onUpdate} disabled={!canInstall}><Icon name="refresh" size={18} /> 更新</button>
                  )}
                  <button className="btn btn--danger sideactions__btn" onClick={onRemove} disabled={removing}>{removing ? (<><span className="spinner" aria-hidden></span> 削除中…</>) : (<><Icon name="delete" size={18} /> 削除</>)}</button>
                </>
              ) : (
                <button className="btn btn--primary sideactions__btn" onClick={onDownload} disabled={!canInstall || downloading}>{downloading ? (<><span className="spinner" aria-hidden></span> 実行中…</>) : (<><span aria-hidden><svg class="icon" width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden><g stroke="currentColor" strokeWidth="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3v12" /><path d="M8 11l4 4 4-4" /><path d="M4 21h16" /></g></svg></span> ダウンロード</>)}</button>
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
