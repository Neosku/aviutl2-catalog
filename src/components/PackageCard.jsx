import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  User,
  RefreshCw,
  Trash2,
  Download,
  Package,
  CheckCircle2,
  Calendar,
} from 'lucide-react';
import { formatDate, hasInstaller, removeInstalledId, runInstallerForItem, runUninstallerForItem, loadInstalledMap } from '../utils/index.js';
import { useCatalogDispatch } from '../utils/catalogStore.jsx';
import ErrorDialog from './ErrorDialog.jsx';
import ProgressCircle from './ProgressCircle.jsx';

function pickThumbnail(item) {
  const groups = Array.isArray(item?.images) ? item.images : [];
  for (const group of groups) {
    const candidate = typeof group?.thumbnail === 'string' ? group.thumbnail.trim() : '';
    if (candidate) return candidate;
    if (Array.isArray(group?.infoImg)) {
      const fallback = group.infoImg.find(src => typeof src === 'string' && src.trim());
      if (fallback) return fallback.trim();
    }
  }
  return '';
}

export default function PackageCard({ item, listSearch = '' }) {
  const navigate = useNavigate();
  const dispatch = useCatalogDispatch();
  const [error, setError] = useState('');
  const [downloading, setDownloading] = useState(false);
  const [updating, setUpdating] = useState(false);
  const [removing, setRemoving] = useState(false);
  const [downloadProgress, setDownloadProgress] = useState(null);
  const [updateProgress, setUpdateProgress] = useState(null);

  const thumbnail = useMemo(() => pickThumbnail(item), [item]);
  const category = item.type || 'その他';
  const isInstalled = item.installed;
  const hasUpdate = isInstalled && !item.isLatest;
  const canInstall = hasInstaller(item);

  const lastUpdated = item.updatedAt ? formatDate(item.updatedAt).replace(/-/g, '/') : '?';

  async function onDownload(e) {
    e.stopPropagation();
    try {
      setDownloading(true);
      setDownloadProgress({ ratio: 0, percent: 0, label: '準備中…', phase: 'init' });
      if (hasInstaller(item)) {
        await runInstallerForItem(item, dispatch, setDownloadProgress);
      } else {
        throw new Error('インストーラーがありません');
      }
    } catch (err) {
      setError(`更新に失敗しました\n\n${err?.message || String(err) || '不明なエラー'}`);
    } finally {
      setDownloading(false);
      setDownloadProgress(null);
    }
  }

  async function onUpdate(e) {
    e.stopPropagation();
    try {
      setUpdating(true);
      setUpdateProgress({ ratio: 0, percent: 0, label: '準備中…', phase: 'init' });
      if (hasInstaller(item)) {
        await runInstallerForItem(item, dispatch, setUpdateProgress);
      } else {
        throw new Error('インストーラーがありません');
      }
    } catch (err) {
      setError(`更新に失敗しました\n\n${err?.message || String(err) || '不明なエラー'}`);
    } finally {
      setUpdating(false);
      setUpdateProgress(null);
    }
  }

  async function onRemove(e) {
    e.stopPropagation();
    try {
      setRemoving(true);
      const hasUninstall = Array.isArray(item?.installer?.uninstall) && item.installer.uninstall.length > 0;
      if (hasInstaller(item) && hasUninstall) {
        await runUninstallerForItem(item, dispatch);
      } else {
        await removeInstalledId(item.id);
        const map = await loadInstalledMap();
        dispatch({ type: 'SET_INSTALLED_MAP', payload: map });
        const map2 = await import('../utils/index.js').then((m) => m.detectInstalledVersionsMap([item]));
        const v2 = String((map2 && map2[item.id]) || '');
        dispatch({ type: 'SET_DETECTED_ONE', payload: { id: item.id, version: v2 } });
      }
    } catch (err) {
      const msg = (err && (err.message || err.toString())) || '不明なエラー';
      setError(`削除に失敗しました\n\n${msg}`);
    } finally {
      setRemoving(false);
      setDownloadProgress(null);
      setUpdateProgress(null);
    }
  }

  const downloadRatio = downloadProgress?.ratio ?? 0;
  const downloadPercent = downloadProgress?.percent ?? Math.round(downloadRatio * 100);
  const updateRatio = updateProgress?.ratio ?? 0;
  const updatePercent = updateProgress?.percent ?? Math.round(updateRatio * 100);

  // Layout constants
  const cardHeight = "h-52"; // Increased height
  const imageSize = "aspect-square";
  const fromSearch = typeof listSearch === 'string' ? listSearch : '';

  return (
    <>
      <div
        className={`group relative flex flex-row ${cardHeight} min-w-[480px] bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden hover:shadow-xl hover:shadow-blue-900/5 dark:hover:shadow-black/40 hover:border-blue-300/50 dark:hover:border-slate-600 transition-all duration-300 ease-out cursor-pointer hover:-translate-y-0.5`}
        onClick={() => navigate(`/package/${encodeURIComponent(item.id)}`, { state: { fromSearch } })}
        role="button"
        tabIndex={0}
      >
        {/* Content Side (Left) */}
        <div className="flex-1 p-4 flex flex-col min-w-0 relative z-10">
          
          {/* Top Info */}
          <div className="mb-1">
            <h3 className="font-bold text-xl text-slate-800 dark:text-slate-100 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors truncate pr-2 tracking-tight" title={item.name}>
              {item.name}
            </h3>

            {/* Author & Date */}
            <div className="flex items-center gap-3 text-sm text-slate-500 dark:text-slate-400 mt-0.5 mb-1 font-medium">
              <div className="flex items-center gap-1 min-w-0">
                <User size={14} className="text-slate-400" />
                <span className="truncate">{item.author || '?'}</span>
              </div>
              <div className="flex items-center gap-1 shrink-0">
                <Calendar size={14} className="text-slate-400" />
                <span>{lastUpdated}</span>
              </div>
            </div>
          </div>

          {/* Description */}
          <p className="text-[15px] text-slate-500 dark:text-slate-400/90 line-clamp-3 leading-normal mb-auto">
            {item.summary || item.description || ''}
          </p>

          {/* Tags */}
          <div className="flex flex-wrap gap-1 mt-1.5 mb-1">
            {Array.isArray(item.tags) && item.tags.slice(0, 3).map((tag, i) => (
              <span key={i} className="px-1.5 py-0.5 rounded text-[10px] bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 font-medium border border-slate-200 dark:border-slate-700">
                {tag}
              </span>
            ))}
             {Array.isArray(item.tags) && item.tags.length > 3 && (
                <span className="px-1.5 py-0.5 rounded text-[10px] bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-500 font-medium border border-slate-200 dark:border-slate-700">
                   +{item.tags.length - 3}
                </span>
             )}
          </div>

          {/* Bottom Actions & Version */}
          <div className="flex items-end justify-between gap-3">
             {/* Version Info */}
             <div className="flex items-center mb-1">
                {isInstalled && (
                  <div className="flex items-center gap-1.5 text-xs font-mono text-slate-500 dark:text-slate-400">
                     <CheckCircle2 size={14} className={hasUpdate ? "text-amber-500" : "text-emerald-500"} />
                     <span>{item.installedVersion}</span>
                  </div>
                )}
             </div>

             {/* Buttons */}
             <div className="flex items-center gap-2 shrink-0 w-[140px] justify-end" onClick={(e) => e.stopPropagation()}>
                {isInstalled ? (
                   <>
                      {hasUpdate ? (
                         <button
                           className="h-9 flex-1 bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400 border border-amber-200 dark:border-amber-800/50 hover:bg-amber-100 dark:hover:bg-amber-900/30 text-xs font-bold rounded-lg transition-colors flex items-center justify-center gap-1.5 cursor-pointer disabled:cursor-not-allowed"
                           onClick={onUpdate}
                           disabled={updating || !canInstall}
                         >
                            {updating ? (
                               <ProgressCircle value={updateRatio} size={16} strokeWidth={3} className="text-amber-600 dark:text-amber-400" />
                            ) : (
                               <RefreshCw size={14} strokeWidth={2.5} className="animate-spin-slow" />
                            )}
                            <span>更新</span>
                         </button>
                      ) : (
                         <div className="h-9 flex-1 bg-slate-100 dark:bg-slate-800 text-emerald-600 dark:text-emerald-400 text-xs font-bold rounded-lg flex items-center justify-center gap-1 cursor-default border border-slate-200 dark:border-slate-700">
                            <CheckCircle2 size={14} />
                            <span>導入済</span>
                         </div>
                      )}
                      <button
                        className="h-9 w-9 shrink-0 flex items-center justify-center text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors cursor-pointer disabled:cursor-not-allowed"
                        title="削除"
                        onClick={onRemove}
                        disabled={removing}
                      >
                         <Trash2 size={16} />
                      </button>
                   </>
                ) : (
                   <button
                     className="h-9 w-full bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-1.5 shadow-lg shadow-blue-600/20 hover:shadow-blue-600/30 active:scale-95 cursor-pointer disabled:cursor-not-allowed"
                     onClick={onDownload}
                     disabled={downloading || !canInstall}
                   >
                      {downloading ? (
                         <ProgressCircle value={downloadRatio} size={16} strokeWidth={3} className="text-white" />
                      ) : (
                         <Download size={14} strokeWidth={2.5} />
                      )}
                      <span>インストール</span>
                   </button>
                )}
             </div>
          </div>
        </div>

        {/* Image Side (Right) */}
        <div className={`relative shrink-0 ${imageSize} h-full ${thumbnail ? 'bg-slate-100 dark:bg-slate-800/50' : 'bg-white dark:bg-slate-900'} after:absolute after:inset-y-0 after:left-0 after:w-px after:bg-slate-100 after:content-[''] dark:after:bg-slate-800`}>
           {/* Background Image/Placeholder */}
           <div className="absolute inset-0 flex items-center justify-center overflow-hidden">
               {thumbnail ? (
                  <img src={thumbnail} alt={item.name} className="w-full h-full object-contain" loading="lazy" />
               ) : (
                  <div className="w-full h-full flex items-center justify-center bg-transparent">
                    {/* Decorative Background Pattern */}
                    <div className="absolute inset-0 opacity-[0.05] dark:opacity-[0.1]"
                         style={{ backgroundImage: 'radial-gradient(circle at 2px 2px, currentColor 1px, transparent 0)', backgroundSize: '16px 16px' }}>
                    </div>
                    
                    {/* Stylized Icon Tile */}
                    <div className="relative">
                      <div className="absolute -inset-4 bg-blue-500/5 dark:bg-blue-400/5 rounded-full blur-2xl group-hover:bg-blue-500/10 transition-colors duration-500"></div>
                      <div className="relative flex items-center justify-center w-16 h-16 rounded-2xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200/40 dark:border-slate-700/50 shadow-sm group-hover:scale-110 group-hover:rotate-3 transition-all duration-500">
                         <Package size={32} className="text-slate-300 dark:text-slate-500" strokeWidth={1.5} />
                      </div>
                    </div>
                  </div>
               )}
           </div>

           {/* Category Badge (Top Right) */}
           <div className="absolute top-2 right-2 z-10">
              <span className="px-2 py-1 rounded-md bg-white/90 dark:bg-slate-900/80 border border-slate-200/50 dark:border-slate-700/50 text-[10px] text-slate-600 dark:text-slate-300 font-bold shadow-sm">
                {category}
              </span>
           </div>
        </div>

        {/* Hover decorative ring */}
        <div className="absolute inset-0 rounded-2xl ring-1 ring-inset ring-transparent group-hover:ring-blue-500/20 dark:group-hover:ring-blue-400/20 pointer-events-none transition-all"></div>
      </div>
      <ErrorDialog open={!!error} message={error} onClose={() => setError('')} />
    </>
  );
}
