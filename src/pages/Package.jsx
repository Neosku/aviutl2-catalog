// パッケージの詳細ページコンポーネント
import React, { useMemo, useState, useEffect, useRef } from 'react';
import { useParams, useLocation, Link } from 'react-router-dom';
import { open } from '@tauri-apps/plugin-shell';
import ImageCarousel from '../components/ImageCarousel.jsx';
import { CheckCircle2, Download, ExternalLink, RefreshCw, Trash2, User, Calendar, ChevronRight, ArrowLeft } from 'lucide-react';
import { useCatalog, useCatalogDispatch } from '../utils/catalogStore.jsx';
import { formatDate, hasInstaller, runInstallerForItem, runUninstallerForItem, removeInstalledId, latestVersionOf, loadInstalledMap } from '../utils/index.js';
import { renderMarkdown } from '../utils/markdown.js';
import ErrorDialog from '../components/ErrorDialog.jsx';
import ProgressCircle from '../components/ProgressCircle.jsx';
import { buildLicenseBody } from '../utils/licenseTemplates.js';

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

function LicenseModal({ license, onClose }) {
  if (!license) return null;
  const body = license.body ?? buildLicenseBody(license);
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" role="dialog" aria-modal="true" aria-labelledby="license-modal-title">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative w-full max-w-2xl rounded-2xl border border-slate-200 bg-white shadow-xl dark:border-slate-800 dark:bg-slate-900">
        <div className="border-b border-slate-100 px-6 py-4 dark:border-slate-800">
          <h3 id="license-modal-title" className="text-lg font-bold">ライセンス: {license.type || '不明'}</h3>
        </div>
        <div className="px-6 py-4">
          {body ? (
            <pre className="max-h-[60vh] overflow-auto rounded-xl border border-slate-200 bg-slate-50 p-4 text-xs text-slate-700 dark:border-slate-800 dark:bg-slate-800/50 dark:text-slate-200">{body}</pre>
          ) : (
            <div className="text-sm text-slate-500 dark:text-slate-400">ライセンス本文がありません。</div>
          )}
        </div>
        <div className="flex justify-end border-t border-slate-100 px-6 py-4 dark:border-slate-800">
          <button type="button" className="btn btn--secondary" onClick={onClose}>閉じる</button>
        </div>
      </div>
    </div>
  );
}

// パッケージ詳細ページコンポーネント
// 指定されたパッケージの詳細情報を表示し、インストール・更新・削除機能を提供
export default function Package() {
  const { id } = useParams();
  const location = useLocation();
  const { items, loading } = useCatalog();
  const dispatch = useCatalogDispatch();
  const fromSearch = typeof location.state?.fromSearch === 'string' ? location.state.fromSearch : '';
  const listLink = fromSearch ? { pathname: '/', search: fromSearch } : '/';

  // URLパラメータのIDに基づいてアイテムを検索
  const item = useMemo(() => items.find(i => i.id === id), [items, id]);
  const imageGroups = Array.isArray(item?.images) ? item.images : [];
  const heroImage = (() => {
    for (const group of imageGroups) {
      if (!Array.isArray(group?.infoImg)) continue;
      const candidate = group.infoImg.find(src => typeof src === 'string' && src.trim());
      if (candidate) return candidate.trim();
    }
    return '';
  })();
  const carouselImages = (() => {
    const result = [];
    imageGroups.forEach(group => {
      if (!Array.isArray(group?.infoImg)) return;
      group.infoImg.forEach(src => {
        if (typeof src === 'string' && src.trim()) {
          result.push({ src: src.trim(), alt: '' });
        }
      });
    });
    return result;
  })();
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
  const [openLicense, setOpenLicense] = useState(null);
  // install=true の自動実行を1回に抑制
  const autoInstallRef = useRef('');

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
  const canInstall = item ? (hasInstaller(item) || !!item.downloadURL) : false;
  const downloadRatio = downloadProgress?.ratio ?? 0;
  const downloadPercent = downloadProgress?.percent ?? Math.round(downloadRatio * 100);
  const downloadLabel = downloadProgress?.label ?? '準備中…';
  const updateRatio = updateProgress?.ratio ?? 0;
  const updatePercent = updateProgress?.percent ?? Math.round(updateRatio * 100);
  const updateLabel = updateProgress?.label ?? '準備中…';
  const licenseEntries = useMemo(() => {
    if (!item) return [];
    const rawLicenses = Array.isArray(item.licenses) ? item.licenses : [];
    const entries = rawLicenses.map((license, idx) => ({
      ...license,
      key: `${license.type || 'license'}-${idx}`,
      body: buildLicenseBody(license),
    }));
    if (!entries.length && item.license) {
      const fallback = { type: item.license, isCustom: false, licenseBody: '', copyrights: [] };
      entries.push({
        ...fallback,
        key: 'legacy-license',
        body: buildLicenseBody(fallback),
      });
    }
    return entries;
  }, [item]);
  const renderableLicenses = useMemo(() => licenseEntries.filter(entry => entry.body), [licenseEntries]);
  const licenseTypesLabel = useMemo(() => {
    const types = Array.isArray(item?.licenses)
      ? item.licenses.map(l => l?.type).filter(Boolean)
      : [];
    if (!types.length && item?.license) types.push(item.license);
    return types.length ? types.join(', ') : '?';
  }, [item]);

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

  useEffect(() => {
    if (!item) return;
    const params = new URLSearchParams(location.search || '');
    const installRequested = params.get('install') === 'true';
    // インストールボタンと同じ条件で自動実行
    if (!installRequested) return;
    if (item.installed) return;
    if (!canInstall || downloading) return;
    const key = `${item.id}|${location.search || ''}`;
    if (autoInstallRef.current === key) return;
    autoInstallRef.current = key;
    void onDownload();
  }, [item, location.search, canInstall, downloading]);

  // アイテムが見つからない場合のエラー表示
  if (!item) {
    if (loading || items.length === 0) {
      return (
        <div className="max-w-3xl mx-auto">
          <div className="p-6 text-slate-500 dark:text-slate-400">読み込み中…</div>
        </div>
      );
    }
    return (
      <div className="max-w-3xl mx-auto">
        <div className="error">パッケージが見つかりませんでした。</div>
      </div>
    );
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
        const detectedMap = await import('../utils/index.js').then(m => m.detectInstalledVersionsMap([item]));
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
  const updated = item.updatedAt ? formatDate(item.updatedAt).replace(/-/g, '/') : '?';
  const latest = latestVersionOf(item) || '?';

  return (
    <div className="space-y-6 max-w-6xl mx-auto min-h-[calc(100vh-6rem)] flex flex-col">
      <nav className="flex items-center text-sm text-slate-500 dark:text-slate-400">
        <Link to={listLink} className="hover:text-slate-900 dark:hover:text-slate-100 transition-colors">
          パッケージ一覧
        </Link>
        <ChevronRight size={16} className="mx-2" />
        <span className="font-medium text-slate-900 dark:text-slate-100 truncate">
          {item.name}
        </span>
      </nav>

      <section className={`relative overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900 ${heroImage ? 'min-h-[160px]' : ''}`}>
        {heroImage && (
          <div className="absolute inset-0 bg-cover bg-center opacity-25" style={{ backgroundImage: `url(${heroImage})` }} aria-hidden />
        )}
        <div className="relative p-6 space-y-3">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="space-y-2">
              <span className="inline-flex items-center gap-2 rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700 dark:bg-blue-900/30 dark:text-blue-300">
                {item.type || '未分類'}
              </span>
              <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">{item.name}</h1>
              {item.summary && <p className="text-sm text-slate-600 dark:text-slate-400 max-w-2xl">{item.summary}</p>}
            </div>
            {item.installed && (
              <span className="inline-flex items-center gap-1 rounded-full bg-green-100 px-3 py-1 text-xs font-bold text-green-700 dark:bg-green-900/40 dark:text-green-300">
                <CheckCircle2 size={14} /> 導入済
              </span>
            )}
          </div>
          {item.tags?.length ? (
            <div className="flex flex-wrap gap-2 text-xs text-slate-500 dark:text-slate-400">
              {item.tags.map((tag) => (
                <span key={tag} className="rounded-full border border-slate-200 px-2 py-1 dark:border-slate-700">
                  #{tag}
                </span>
              ))}
            </div>
          ) : null}
        </div>
      </section>

      {carouselImages.length ? (
        <section className="space-y-3">
          <h2 className="text-lg font-bold">スクリーンショット</h2>
          <ImageCarousel images={carouselImages} />
        </section>
      ) : null}

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px] flex-1">
        <div className="space-y-6">
          <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <h2 className="text-lg font-bold mb-2">概要</h2>
            <p className="text-sm text-slate-600 dark:text-slate-400">{item.summary || '?'}</p>
          </section>

          {item.description && (
            <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
              <h2 className="text-lg font-bold mb-3">詳細説明</h2>
              {descriptionLoading ? (
                <p className="text-sm text-slate-500 dark:text-slate-400">詳細説明を読み込み中です…</p>
              ) : (
                <div
                  className="prose prose-slate max-w-none dark:prose-invert"
                  dangerouslySetInnerHTML={{ __html: descriptionHtml }}
                  onClick={async (e) => {
                    const link = e.target.closest('a');
                    if (link && link.href) {
                      e.preventDefault();
                      await open(link.href);
                    }
                  }}
                />
              )}
              {descriptionError ? (
                <p className="error mt-3" role="alert">{descriptionError}</p>
              ) : null}
            </section>
          )}

          {item.dependencies?.length ? (
            <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
              <h2 className="text-lg font-bold mb-2">依存関係</h2>
              <p className="text-sm text-slate-600 dark:text-slate-400">{item.dependencies.join(', ')}</p>
            </section>
          ) : null}
        </div>

        <aside className="flex flex-col gap-4 lg:gap-0 h-full">
          <div className="contents lg:block lg:sticky lg:top-6 lg:z-10 lg:space-y-4">
            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900 space-y-4">
            <div className="flex items-center justify-between text-sm text-slate-600 dark:text-slate-400">
              <span>作者</span>
              <span className="flex items-center gap-2 text-slate-800 dark:text-slate-200"><User size={14} />{item.author || '?'}</span>
            </div>
            <div className="flex items-center justify-between text-sm text-slate-600 dark:text-slate-400">
              <span>更新日</span>
              <span className="flex items-center gap-2 text-slate-800 dark:text-slate-200"><Calendar size={14} />{updated}</span>
            </div>
            <div className="flex items-center justify-between text-sm text-slate-600 dark:text-slate-400">
              <span>最新バージョン</span>
              <span className="text-slate-800 dark:text-slate-200">{latest}</span>
            </div>
            {item.installedVersion ? (
              <div className="flex items-center justify-between text-sm text-slate-600 dark:text-slate-400">
                <span>現在のバージョン</span>
                <span className="text-slate-800 dark:text-slate-200">{item.installedVersion}</span>
              </div>
            ) : null}
            {item.niconiCommonsId ? (
              <div className="flex items-center justify-between text-sm text-slate-600 dark:text-slate-400">
                <span>ニコニコモンズID</span>
                <span className="text-slate-800 dark:text-slate-200 font-mono">{item.niconiCommonsId}</span>
              </div>
            ) : null}
            <div className="space-y-2">
              <span className="text-sm text-slate-600 dark:text-slate-400">ライセンス</span>
              <div className="flex flex-wrap gap-2">
                {renderableLicenses.length ? (
                  renderableLicenses.map((license) => (
                    <button
                      type="button"
                      key={license.key}
                      className="rounded-full border border-slate-200 px-3 py-1 text-xs text-slate-600 hover:border-blue-400 hover:text-blue-600 dark:border-slate-700 dark:text-slate-300 dark:hover:border-blue-500 dark:hover:text-blue-400"
                      onClick={() => setOpenLicense(license)}
                      aria-label={`ライセンス ${license.type || '不明'} の本文を表示`}
                    >
                      {license.type || '不明'}
                    </button>
                  ))
                ) : (
                  <span className="text-xs text-slate-500 dark:text-slate-400">{licenseTypesLabel}</span>
                )}
              </div>
            </div>
            {item.repoURL ? (
              <a className="inline-flex items-center gap-2 text-sm text-blue-600 hover:underline dark:text-blue-400 break-all" href={item.repoURL} target="_blank" rel="noopener noreferrer">
                <ExternalLink size={16} className="shrink-0" /> {item.repoURL}
              </a>
            ) : null}
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900 space-y-3">
            {item.installed ? (
              <>
                {item.isLatest ? (
                  <div className="inline-flex items-center gap-2 rounded-full bg-green-100 px-3 py-1 text-xs font-bold text-green-700 dark:bg-green-900/40 dark:text-green-300">
                    <CheckCircle2 size={14} /> 最新{item.installedVersion ? `（${item.installedVersion}）` : ''}
                  </div>
                ) : (
                  <button
                    className="h-10 px-4 bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400 border border-amber-200 dark:border-amber-800/50 hover:bg-amber-100 dark:hover:bg-amber-900/30 text-sm font-bold rounded-lg transition-colors flex items-center justify-center gap-2 w-full"
                    onClick={onUpdate}
                    disabled={!canInstall || updating}
                    type="button"
                  >
                    {updating ? (
                      <span className="flex items-center gap-2">
                        <ProgressCircle value={updateRatio} size={20} strokeWidth={3} className="text-amber-600 dark:text-amber-400" ariaLabel={`${updateLabel} ${updatePercent}%`} />
                        {updateLabel} {`${updatePercent}%`}
                      </span>
                    ) : (
                      <>
                        <RefreshCw size={18} /> 更新
                      </>
                    )}
                  </button>
                )}
                <button className="btn btn--danger w-full" onClick={onRemove} disabled={removing} type="button">
                  {removing ? '削除中…' : (<><Trash2 size={18} /> 削除</>)}
                </button>
              </>
            ) : (
              <button className="btn btn--primary w-full" onClick={onDownload} disabled={!canInstall || downloading} type="button">
                {downloading ? (
                  <span className="flex items-center gap-2">
                    <ProgressCircle value={downloadRatio} size={20} strokeWidth={3} ariaLabel={`${downloadLabel} ${downloadPercent}%`} />
                    {downloadLabel} {`${downloadPercent}%`}
                  </span>
                ) : (
                  <>
                    <Download size={18} /> インストール
                  </>
                )}
              </button>
            )}
          </div>

          </div>
          <div className="contents lg:block lg:sticky lg:bottom-0 lg:z-10 lg:mt-auto lg:pt-4">
            <Link to={listLink} className="btn btn--secondary w-full justify-center flex items-center gap-2">
              <ArrowLeft size={18} /> パッケージ一覧に戻る
            </Link>
          </div>
        </aside>
      </div>

      {openLicense && <LicenseModal license={openLicense} onClose={() => setOpenLicense(null)} />}
      <ErrorDialog open={!!error} message={error} onClose={() => setError('')} />
    </div>
  );
}
