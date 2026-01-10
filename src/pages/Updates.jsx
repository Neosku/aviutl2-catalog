import React, { useMemo, useState } from 'react';
import { useCatalog, useCatalogDispatch } from '../app/store/catalog.jsx';
import { hasInstaller, latestVersionOf, logError, runInstallerForItem } from '../app/utils.js';
import ErrorDialog from '../components/ErrorDialog.jsx';
import ProgressCircle from '../components/ProgressCircle.jsx';

export default function Updates() {
  const { items } = useCatalog();
  const dispatch = useCatalogDispatch();
  const [bulkUpdating, setBulkUpdating] = useState(false);
  const [bulkProgress, setBulkProgress] = useState(null);
  const [error, setError] = useState('');
  const [itemProgress, setItemProgress] = useState({});

  const updatableItems = useMemo(() => {
    return items.filter((item) => item.installed && !item.isLatest && hasInstaller(item));
  }, [items]);

  const bulkRatio = bulkProgress?.ratio ?? 0;
  const bulkPercent = bulkProgress?.percent ?? Math.round(bulkRatio * 100);
  const bulkLabel = bulkProgress?.label ?? '更新処理中…';
  const bulkCurrent = bulkProgress?.current ?? 0;
  const bulkTotal = bulkProgress?.total ?? (bulkUpdating ? (updatableItems.length || 0) : 0);

  async function handleBulkUpdate() {
    if (bulkUpdating || !updatableItems.length) return;
    setBulkUpdating(true);
    setError('');
    setBulkProgress({ ratio: 0, percent: 0, label: '準備中…', current: 0, total: updatableItems.length });

    const targets = updatableItems.slice();
    const total = targets.length || 1;
    const failed = [];

    for (let i = 0; i < targets.length; i++) {
      const item = targets[i];
      setBulkProgress({
        ratio: 0,
        percent: 0,
        itemName: item.name,
        status: '準備中…',
        current: i + 1,
        total,
      });

      try {
        await runInstallerForItem(item, dispatch, (progress) => {
          const stepRatio = progress && Number.isFinite(progress.ratio) ? Math.min(1, Math.max(0, progress.ratio)) : 0;
          const percent = Math.round(stepRatio * 100);
          const label = progress?.label || '処理中…';
          setBulkProgress({
            ratio: stepRatio,
            percent,
            itemName: item.name,
            status: label,
            current: i + 1,
            total,
          });
        });
        setBulkProgress({
          ratio: 1,
          percent: 100,
          itemName: item.name,
          status: '完了',
          current: i + 1,
          total,
        });
      } catch (err) {
        const msg = err?.message || String(err) || '不明なエラー';
        failed.push({ item, msg });
        try { await logError(`[BulkUpdate] ${item.id}: ${msg}`); } catch (_) { }
        setBulkProgress({
          ratio: 1,
          percent: 100,
          itemName: item.name,
          status: 'エラー',
          current: i + 1,
          total,
        });
      }
    }

    if (failed.length) {
      const example = failed[0];
      setError(`${failed.length}件のプラグインで更新に失敗しました（例: ${example.item.name}: ${example.msg}）`);
    }
    setBulkProgress(null);
    setBulkUpdating(false);
  }

  async function handleUpdate(item) {
    if (itemProgress[item.id]) return;
    setError('');
    setItemProgress(prev => ({ ...prev, [item.id]: { ratio: 0, label: '準備中…' } }));
    try {
      await runInstallerForItem(item, dispatch, (progress) => {
        if (progress) {
          setItemProgress(prev => ({
            ...prev,
            [item.id]: { ratio: progress.ratio, label: progress.label || '処理中…' }
          }));
        }
      });
    } catch (err) {
      const msg = err?.message || String(err) || '不明なエラー';
      setError(`更新に失敗しました\n\n${msg}`);
    } finally {
      setItemProgress(prev => {
        const next = { ...prev };
        delete next[item.id];
        return next;
      });
    }
  }

  return (
    <>
      <div className="max-w-3xl mx-auto select-none">
        <div className="flex flex-wrap justify-between items-end gap-4 mb-6">
          <div>
            <h2 className="text-xl font-bold mb-1">アップデートセンター</h2>
            <p className="text-sm text-slate-500 dark:text-slate-400">更新可能なパッケージを確認します</p>
          </div>
          <button
            className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 shadow-lg transition-all text-sm font-bold cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            onClick={handleBulkUpdate}
            disabled={bulkUpdating || !updatableItems.length}
            type="button"
          >
            すべて更新
          </button>
        </div>

        {bulkUpdating && (
          <div className="mb-6 p-5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-6">
                <div className="flex items-baseline gap-1">
                  <span className="text-4xl font-bold text-blue-600 dark:text-blue-500 font-mono tracking-tight">
                    {bulkCurrent}
                  </span>
                  <span className="text-xl font-medium text-slate-300 dark:text-slate-700">/</span>
                  <span className="text-xl font-medium text-slate-400 dark:text-slate-500">{bulkTotal}</span>
                </div>
                <div className="min-w-0">
                  <div className="text-base font-bold text-slate-800 dark:text-slate-100 truncate">
                    {bulkProgress?.itemName}
                  </div>
                  <div className="flex items-center gap-2 mt-0.5">
                    <div className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse" />
                    <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
                      {bulkProgress?.status}
                    </span>
                  </div>
                </div>
              </div>
              <div className="shrink-0 text-right">
                <span className="text-lg font-bold text-blue-600 dark:text-blue-500 font-mono">{bulkPercent}%</span>
              </div>
            </div>
            <div className="h-2 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
              <div
                className={`h-full bg-blue-600 dark:bg-blue-500 ${bulkPercent > 0 ? 'transition-all duration-300 ease-out' : ''}`}
                style={{ width: `${bulkPercent}%` }}
              />
            </div>
          </div>
        )}

        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
          {updatableItems.length === 0 ? (
            <div className="p-8 text-center text-slate-500 dark:text-slate-400">
              <p>すべて最新の状態です</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <div className="min-w-[760px]">
                <div className="px-4 py-3 border-b border-slate-200 dark:border-slate-800 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide grid grid-cols-[minmax(0,2.5fr)_minmax(0,1fr)_minmax(0,1.5fr)_minmax(0,1fr)_minmax(0,1fr)_7.5rem] gap-2">
                  <span>パッケージ</span>
                  <span>作者</span>
                  <span>種類</span>
                  <span>更新前</span>
                  <span>更新後</span>
                  <span className="text-right"></span>
                </div>
                <div className="divide-y divide-slate-100 dark:divide-slate-800">
                  {updatableItems.map((item) => (
                    <div key={item.id} className="px-4 py-4 grid grid-cols-[minmax(0,2.5fr)_minmax(0,1fr)_minmax(0,1.5fr)_minmax(0,1fr)_minmax(0,1fr)_7.5rem] gap-2 items-center hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                      <div className="min-w-0">
                        <div className="font-semibold text-sm text-slate-800 dark:text-slate-100 truncate">{item.name}</div>
                        <div className="text-xs text-slate-500 dark:text-slate-400 truncate">{item.id}</div>
                      </div>
                      <div className="text-sm text-slate-600 dark:text-slate-300 truncate">{item.author || '?'}</div>
                      <div className="text-sm text-slate-600 dark:text-slate-300 truncate">{item.type || '?'}</div>
                      <div className="text-sm text-slate-600 dark:text-slate-300">{item.installedVersion || '?'}</div>
                      <div className="text-sm font-semibold text-green-600 dark:text-green-400">{latestVersionOf(item) || ''}</div>
                      <div className="text-right">
                        {itemProgress[item.id] ? (
                          <div className="flex items-center justify-end gap-2">
                            <span className="text-xs text-slate-500 dark:text-slate-400">{itemProgress[item.id].label}</span>
                            <ProgressCircle value={itemProgress[item.id].ratio} size={24} strokeWidth={3} />
                          </div>
                        ) : (
                          <button
                            className="px-3 py-1.5 bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 rounded text-xs hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors cursor-pointer disabled:cursor-not-allowed"
                            onClick={() => handleUpdate(item)}
                            disabled={!!itemProgress[item.id]}
                            type="button"
                          >
                            更新
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
      <ErrorDialog open={!!error} message={error} onClose={() => setError('')} />
    </>
  );
}
