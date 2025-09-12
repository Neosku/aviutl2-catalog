// メインページに表示するカードコンポーネント
import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { formatDate, hasInstaller, runInstallerForItem, runUninstallerForItem, removeInstalledId, loadInstalledMap } from '../app/utils.js';
import { useCatalogDispatch } from '../app/store/catalog.jsx';
import ErrorDialog from './ErrorDialog.jsx';
import Icon from './Icon.jsx';

// メインページに表示するカードコンポーネント
export default function PluginCard({ item }) {
  // 先頭画像のURL（なければプレースホルダーを出す）
  const thumb = item?.images?.[0]?.src;
  const dispatch = useCatalogDispatch();
  // UI状態管理（エラー/処理中フラグ）
  const [error, setError] = useState('');
  const [downloading, setDownloading] = useState(false);
  const [updating, setUpdating] = useState(false);
  const [removing, setRemoving] = useState(false);
  // インストーラーがある場合に操作を有効化
  const canInstall = hasInstaller(item) ;

  // ダウンロード/更新ボタンを押した時の処理
  async function onDownload(e) {
    // 全体のクリック遷移を止める
    e.stopPropagation();
    e.preventDefault();
    try {
      setDownloading(true); // ダウンロード中フラグON
      if (hasInstaller(item)) {
        await runInstallerForItem(item, dispatch);
      } else {
        throw new Error('インストーラーがありません');
      }
    } catch (err) {
      setError(`更新に失敗しました\n\n${err?.message || String(err) || '不明なエラー'}`);
    } finally {
      setDownloading(false);
    }
  }

  // 更新ボタン押下時の処理（最新版で上書きインストール）
  async function onUpdate(e) {
    // 全体のクリック遷移を止める
    e.stopPropagation();
    e.preventDefault();
    try {
      setUpdating(true);
      if (hasInstaller(item)) {
        await runInstallerForItem(item, dispatch);
      } else {
        throw new Error('インストーラーがありません');
      }
    } catch (err) {
      setError(`更新に失敗しました\n\n${err?.message || String(err) || '不明なエラー'}`);
    } finally {
      setUpdating(false);
    }
  }

  // 削除ボタン押下時の処理
  // アンインストーラが定義されていれば実行。無い場合はローカルのインストール状態のみクリア（改善必要）
  async function onRemove(e) {
    e.stopPropagation();
    e.preventDefault();
    try {
      setRemoving(true);
      const hasUninstall = Array.isArray(item?.installer?.uninstall) && item.installer.uninstall.length > 0;
      if (hasInstaller(item) && hasUninstall) {
        await runUninstallerForItem(item, dispatch);
      } else {
        await removeInstalledId(item.id);
        const map = await loadInstalledMap();
        dispatch({ type: 'SET_INSTALLED_MAP', payload: map });
        const map2 = await import('../app/utils.js').then((m) => m.detectInstalledVersionsMap([item]));
        const v2 = String((map2 && map2[item.id]) || '');
        dispatch({ type: 'SET_DETECTED_ONE', payload: { id: item.id, version: v2 } });
      }
    } catch (err) {
      const msg = (err && (err.message || err.toString())) || '不明なエラー';
      setError(`削除に失敗しました\n\n${msg}`);
    } finally {
      setRemoving(false);
    }
  }

  return (
    <>
      {/* カード全体。クリックで詳細ページへ遷移 */}
      <Link
        to={`/package/${encodeURIComponent(item.id)}`}
        className={`card card--plugin`}
        // CSSでの種別色分けなどに使う属性
        data-type={item.type || ''}
      >
        {/* サムネイル領域（画像 or プレースホルダー）*/}
        <div className="card__thumb">
          {thumb ? (
            <img src={thumb} alt="" loading="lazy" />
          ) : (
            <div className="thumb thumb--placeholder" aria-hidden="true"></div>
          )}
          <span className="pill pill--type" aria-label="種別">{item.type || '?'}</span>
        </div>
        {!thumb && (
          <span className="pill pill--type" aria-label="type">{item.type || '?'}</span>
        )}
        {/* コンテンツ（タイトル/概要/タグ/メタ/アクション）*/}
        <div className="card__content">
          <h3 className="card__title">{item.name}</h3>
          <p className="card__summary">{item.summary}</p>
          {/* タグ一覧 */}
          <div className="card__tags">
            {(item.tags || []).map((t) => (
              <span className="tag" key={t}>{t}</span>

            ))}
          </div>
          {/* メタ情報：作者 / 更新日 / インストール状況 */}
          <div className="card__meta">
            <span className="meta"><span className="meta__icon" aria-hidden><Icon name="person" /></span>{item.author || '?'}</span>
            <span className="meta"><span className="meta__icon" aria-hidden><Icon name="calendar" /></span>{item.updatedAt ? formatDate(item.updatedAt) : '?'}</span>
            {item.installedVersion ? (
              <span className="meta" title="現在のバージョン"><span className="meta__icon" aria-hidden><Icon name="check_circle" /></span>現在 {item.installedVersion}</span>
            ) : (
              <span className="meta" title="未インストール">未インストール</span>
            )}
          </div>
          {/* 操作ボタン群：インストール済みなら 更新/削除、未インストールなら ダウンロード */}
          <div className="card__actions">
            {item.installed ? (
              <>
                {item.isLatest ? (
                  <span className="pill pill--ok" title={item.installedVersion ? `installed=${item.installedVersion}` : ''}>
                    <span aria-hidden><Icon name="check_circle" /></span> 最新
                  </span>
                ) : (
                  <button className="btn btn--primary" onClick={onUpdate} disabled={!canInstall || updating}>
                    {updating ? (<><span className="spinner" aria-hidden></span> 実行中…</>) : (<><span aria-hidden><Icon name="refresh" /></span> 更新</>)}
                  </button>
                )}
                <button className="btn btn--danger" onClick={onRemove} disabled={removing}>
                  {removing ? (<><span className="spinner" aria-hidden></span> 削除中…</>) : (<><span aria-hidden><Icon name="delete" /></span> 削除</>)}
                </button>
              </>
            ) : (
              <button className="btn btn--primary" onClick={onDownload} disabled={!canInstall || downloading}>
                {downloading ? (<><span className="spinner" aria-hidden></span> 実行中…</>) : (<><span aria-hidden><Icon name="download" /></span> ダウンロード</>)}
              </button>
            )}
          </div>
        </div>
      </Link>
      {/* エラーダイアログ（インストール/更新/削除時の失敗表示）*/}
      <ErrorDialog open={!!error} message={error} onClose={() => setError('')} />
    </>
  );
}
