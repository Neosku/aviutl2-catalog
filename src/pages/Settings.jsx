import React, { useEffect, useState } from 'react';
import { Settings as SettingsIcon, Moon, Sun, FolderOpen, Download, Upload, Info, Check } from 'lucide-react';
import { invoke } from '@tauri-apps/api/core';
import * as z from 'zod';
import { useCatalog, useCatalogDispatch } from '../utils/catalogStore.jsx';
import {
  detectInstalledVersionsMap,
  getSettings,
  loadInstalledMap,
  logError,
  runInstallerForItem,
  runUninstallerForItem,
  saveInstalledSnapshot,
  hasInstaller,
  resetPackageStateLocalState,
} from '../utils/index.js';

const iconBlockStyle = { display: 'block' };
const installedImportValueSchema = z.union([z.string(), z.number(), z.boolean(), z.null(), z.undefined()]);
const installedImportSchema = z.union([
  z.array(installedImportValueSchema),
  z.record(z.string(), installedImportValueSchema),
]);

function applyTheme(theme) {
  const root = document?.documentElement;
  if (!root) return;
  const value = String(theme || '').trim();
  const isDark = value !== 'lightmode';
  root.classList.toggle('dark', isDark);
}

export default function Settings() {
  const { items } = useCatalog();
  const dispatch = useCatalogDispatch();

  const [form, setForm] = useState({
    aviutl2Root: '',
    isPortableMode: false,
    theme: 'darkmode',
    packageStateOptOut: false,
  });

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [appVersion, setAppVersion] = useState('');
  const [syncBusy, setSyncBusy] = useState(false);
  const [syncStatus, setSyncStatus] = useState('');
  const [initialPackageStateOptOut, setInitialPackageStateOptOut] = useState(false);

  useEffect(() => {
    let mounted = true;
    (async () => {
      setError('');
      try {
        const cur = await getSettings();
        if (mounted) {
          const theme = String(cur?.theme || 'darkmode');
          const aviutl2Root = String(cur?.aviutl2_root || '');
          const isPortableMode = !!cur?.is_portable_mode;
          const packageStateOptOut = !!cur?.package_state_opt_out;
          setForm({ theme, aviutl2Root, isPortableMode, packageStateOptOut });
          setInitialPackageStateOptOut(packageStateOptOut);
          applyTheme(theme);
        }
      } catch (e) {
        try {
          await logError(`[settings] getSettings failed: ${e?.message || e}`);
        } catch {}
      }

      try {
        const app = await import('@tauri-apps/api/app');
        const v = app?.getVersion ? await app.getVersion() : '';
        if (mounted) setAppVersion(String(v || ''));
      } catch (e) {
        try {
          await logError(`[settings] getVersion failed: ${e?.message || e}`);
        } catch {}
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  function onChange(e) {
    const { name, value, type, checked } = e.target;
    const v = type === 'checkbox' ? !!checked : value;
    setForm((prev) => ({ ...prev, [name]: v }));
    if (name === 'theme') applyTheme(v);
  }

  function handlePortableToggle(next) {
    setForm((prev) => ({ ...prev, isPortableMode: !!next }));
  }

  function handlePackageStateEnabledToggle(nextEnabled) {
    setForm((prev) => ({ ...prev, packageStateOptOut: !nextEnabled }));
  }

  async function pickDir(field, title) {
    try {
      const dialog = await import('@tauri-apps/plugin-dialog');
      const p = await dialog.open({ directory: true, multiple: false, title });
      if (p) setForm((prev) => ({ ...prev, [field]: String(p) }));
    } catch {
      setError('ディレクトリ選択に失敗しました');
    }
  }

  async function onSave() {
    setSaving(true);
    setError('');
    setSuccess('');
    try {
      const resolved = await invoke('resolve_aviutl2_root', { raw: String(form.aviutl2Root || '') });
      const aviutl2Root = String(resolved || '').trim();
      if (!aviutl2Root) throw new Error('AviUtl2 のフォルダを指定してください。');

      await invoke('update_settings', {
        aviutl2Root,
        isPortableMode: !!form.isPortableMode,
        theme: (form.theme || 'darkmode').trim(),
        packageStateOptOut: !!form.packageStateOptOut,
      });

      applyTheme(form.theme);
      const nextOptOut = !!form.packageStateOptOut;
      if (!initialPackageStateOptOut && nextOptOut) {
        await resetPackageStateLocalState();
      }
      setInitialPackageStateOptOut(nextOptOut);

      try {
        const detected = await detectInstalledVersionsMap(items || []);
        dispatch({ type: 'SET_DETECTED_MAP', payload: detected });
      } catch {}

      setSuccess('設定を保存しました。');
      setTimeout(() => setSuccess(''), 3000);
    } catch (e) {
      setError(e?.message ? String(e.message) : '保存に失敗しました。権限やパスをご確認ください。');
      try {
        await logError(`[settings] save failed: ${e?.message || e}`);
      } catch {}
    } finally {
      setSaving(false);
    }
  }

  async function handleExport() {
    if (syncBusy) return;
    setError('');
    setSyncBusy(true);
    setSyncStatus('エクスポート先を選択しています…');
    try {
      const dialog = await import('@tauri-apps/plugin-dialog');
      const now = new Date();
      const stamp = [
        now.getFullYear(),
        String(now.getMonth() + 1).padStart(2, '0'),
        String(now.getDate()).padStart(2, '0'),
      ].join('');
      const defaultPath = `installed-export-${stamp}.json`;
      const outPath = await dialog.save({
        title: 'パッケージ一覧のエクスポート',
        defaultPath,
        filters: [{ name: 'JSON', extensions: ['json'] }],
      });
      const savePath = Array.isArray(outPath) ? outPath[0] : outPath;
      if (!savePath) return;
      setSyncStatus('エクスポートを作成中…');
      const installed = await loadInstalledMap();
      const fs = await import('@tauri-apps/plugin-fs');
      const payload = JSON.stringify(installed || {}, null, 2);
      await fs.writeTextFile(String(savePath), payload);
      try {
        await dialog.message('エクスポートを保存しました。', { title: 'エクスポート', kind: 'info' });
      } catch {}
    } catch (e) {
      setError('エクスポートに失敗しました。\n権限や保存先を確認してください。');
      try {
        await logError(`[settings] export failed: ${e?.message || e}`);
      } catch {}
    } finally {
      setSyncBusy(false);
      setSyncStatus('');
    }
  }

  async function handleImport() {
    if (syncBusy) return;
    setError('');
    setSyncBusy(true);
    setSyncStatus('インポート準備中…');
    try {
      const dialog = await import('@tauri-apps/plugin-dialog');
      const ok = await dialog.confirm('インポート内容に合わせてパッケージをインストール/削除します。\n続行しますか？', {
        title: 'インポート',
        kind: 'warning',
      });
      if (!ok) return;
      setSyncStatus('インポートファイルを選択しています…');
      const filePath = await dialog.open({
        title: 'インポートファイルを選択',
        multiple: false,
        directory: false,
        filters: [{ name: 'JSON', extensions: ['json'] }],
      });
      const selectedPath = Array.isArray(filePath) ? filePath[0] : filePath;
      if (!selectedPath) return;

      setSyncStatus('インポートファイルを読み込み中…');
      const fs = await import('@tauri-apps/plugin-fs');
      const raw = await fs.readTextFile(String(selectedPath));
      let parsed;
      try {
        parsed = JSON.parse(raw || '{}');
      } catch {
        throw new Error('インポートファイルのJSONを読み込めませんでした。');
      }

      const targetMap = normalizeInstalledImport(parsed);
      const targetIds = Object.keys(targetMap);
      if (!targetIds.length) throw new Error('インポートファイルの内容が空です。');
      const targetIdSet = new Set(targetIds);

      const catalogItems = Array.isArray(items) ? items : [];
      if (!catalogItems.length) throw new Error('カタログ情報が読み込まれていません。');

      const idToItem = new Map(catalogItems.map((item) => [String(item.id), item]));
      const unknownIds = targetIds.filter((id) => !idToItem.has(id));

      setSyncStatus('インストール状態を検出中…');
      const detected = await detectInstalledVersionsMap(catalogItems);
      const currentIds = Object.entries(detected || {})
        .filter(([, v]) => v)
        .map(([id]) => id);

      const toInstall = targetIds.filter((id) => idToItem.has(id) && !detected?.[id]);
      const toRemove = currentIds.filter((id) => !targetIdSet.has(id));

      const skippedInstall = [];
      const skippedRemove = [];
      const failedInstall = [];
      const failedRemove = [];
      let installedCount = 0;
      let removedCount = 0;

      for (let i = 0; i < toInstall.length; i++) {
        const id = toInstall[i];
        const item = idToItem.get(id);
        if (!item || !hasInstaller(item)) {
          skippedInstall.push(id);
          continue;
        }
        const label = item?.name ? `${item.name} (${id})` : id;
        setSyncStatus(`インストール中… (${i + 1}/${toInstall.length}) ${label}`);
        try {
          await runInstallerForItem(item, dispatch);
          installedCount += 1;
        } catch (e) {
          failedInstall.push(`${id}: ${e?.message || e}`);
        }
      }

      for (let i = 0; i < toRemove.length; i++) {
        const id = toRemove[i];
        const item = idToItem.get(id);
        if (!item || !Array.isArray(item?.installer?.uninstall) || item.installer.uninstall.length === 0) {
          skippedRemove.push(id);
          continue;
        }
        const label = item?.name ? `${item.name} (${id})` : id;
        setSyncStatus(`アンインストール中… (${i + 1}/${toRemove.length}) ${label}`);
        try {
          await runUninstallerForItem(item, dispatch);
          removedCount += 1;
        } catch (e) {
          failedRemove.push(`${id}: ${e?.message || e}`);
        }
      }

      setSyncStatus('インストール状態を更新中…');
      const finalDetected = await detectInstalledVersionsMap(catalogItems);
      dispatch({ type: 'SET_DETECTED_MAP', payload: finalDetected });
      const snap = await saveInstalledSnapshot(finalDetected);
      dispatch({ type: 'SET_INSTALLED_MAP', payload: snap });

      const summary = [
        `インストール: ${installedCount}/${toInstall.length}件`,
        `削除: ${removedCount}/${toRemove.length}件`,
      ];
      if (unknownIds.length) summary.push(`未登録ID: ${unknownIds.join(', ')}`);
      if (skippedInstall.length) summary.push(`インストール不可: ${skippedInstall.join(', ')}`);
      if (skippedRemove.length) summary.push(`削除不可: ${skippedRemove.join(', ')}`);
      if (failedInstall.length) summary.push(`インストール失敗: ${failedInstall.join(', ')}`);
      if (failedRemove.length) summary.push(`削除失敗: ${failedRemove.join(', ')}`);
      const hasIssues =
        unknownIds.length ||
        skippedInstall.length ||
        skippedRemove.length ||
        failedInstall.length ||
        failedRemove.length;
      try {
        await dialog.message(summary.join('\n'), {
          title: 'インポート結果',
          kind: hasIssues ? 'warning' : 'info',
        });
      } catch {}
    } catch (e) {
      setError(e?.message ? String(e.message) : 'インポートに失敗しました。');
      try {
        await logError(`[settings] import failed: ${e?.message || e}`);
      } catch {}
    } finally {
      setSyncBusy(false);
      setSyncStatus('');
    }
  }

  const packageStateEnabled = !form.packageStateOptOut;

  return (
    <div className="max-w-3xl mx-auto space-y-7 animate-in slide-in-from-bottom-2 duration-300 select-none">
      <div>
        <h2 className="text-2xl font-bold mb-2">設定</h2>
        <p className="text-slate-500 dark:text-slate-400 text-sm">アプリケーションの設定とカスタマイズ</p>
      </div>

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 text-red-700 dark:border-red-900/40 dark:bg-red-900/20 dark:text-red-200 px-4 py-3 text-sm">
          {error}
        </div>
      )}

      <section className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
        <div className="px-6 py-3 border-b border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50 flex items-center gap-2">
          <SettingsIcon size={18} className="text-slate-500 dark:text-slate-400" />
          <h3 className="font-bold text-sm text-slate-700 dark:text-slate-200">アプリ設定</h3>
        </div>
        <div className="p-6 space-y-6">
          <div className="space-y-2">
            <label className="text-sm font-medium" htmlFor="settings-aviutl2-root">
              AviUtl2 フォルダ
            </label>
            <div className="text-xs text-slate-500 dark:text-slate-400">
              aviutl2.exeを含むフォルダを指定してください。
            </div>
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
              <input
                id="settings-aviutl2-root"
                name="aviutl2Root"
                value={form.aviutl2Root}
                onChange={onChange}
                className="flex-1 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-sm cursor-text select-text"
                placeholder="aviutl2.exe のあるフォルダ"
              />
              <button
                className="flex items-center gap-2 px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 text-sm hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer"
                type="button"
                onClick={() => pickDir('aviutl2Root', 'AviUtl2 のルートフォルダ')}
              >
                <FolderOpen size={16} />
                参照
              </button>
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between gap-4">
              <div className="flex-1">
                <div className="text-sm font-medium">
                  ポータブルモード{' '}
                  <span className="text-xs text-slate-500 dark:text-slate-400 font-normal">（オフ推奨）</span>
                </div>
                <div className="text-xs text-slate-500 dark:text-slate-400">
                  プラグインやスクリプトを aviutl2.exe と同じ階層にある data フォルダに保存します
                </div>
              </div>
              <button
                type="button"
                onClick={() => handlePortableToggle(!form.isPortableMode)}
                className={`shrink-0 relative inline-flex h-7 w-14 items-center rounded-full transition-colors cursor-pointer ${form.isPortableMode ? 'bg-blue-600 hover:bg-blue-700' : 'bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600'}`}
              >
                <span
                  className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition-transform ${form.isPortableMode ? 'translate-x-8' : 'translate-x-1'}`}
                />
              </button>
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between gap-4">
              <div className="flex-1">
                <div className="text-sm font-medium">ダークモード</div>
              </div>
              <button
                onClick={() => {
                  const next = form.theme === 'lightmode' ? 'darkmode' : 'lightmode';
                  setForm((prev) => ({ ...prev, theme: next }));
                  applyTheme(next);
                }}
                className={`shrink-0 relative inline-flex h-7 w-14 items-center rounded-full transition-colors cursor-pointer ${form.theme === 'lightmode' ? 'bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600' : 'bg-blue-600 hover:bg-blue-700'}`}
                type="button"
              >
                <span
                  className={`flex items-center justify-center h-5 w-5 transform rounded-full bg-white shadow transition-transform ${form.theme === 'lightmode' ? 'translate-x-1' : 'translate-x-8'}`}
                >
                  {form.theme === 'lightmode' ? (
                    <Sun size={12} className="text-slate-400" style={iconBlockStyle} />
                  ) : (
                    <Moon size={12} className="text-blue-600" style={iconBlockStyle} />
                  )}
                </span>
              </button>
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between gap-4">
              <div className="flex-1">
                <div className="text-sm font-medium">匿名統計の送信</div>
                <div className="text-xs text-slate-500 dark:text-slate-400">
                  利用状況を参考にした表示を提供するため、インストール・アンインストールされたパッケージID、およびインストール済みパッケージIDを匿名で送信します。ご協力をお願いします。
                </div>
              </div>
              <button
                type="button"
                onClick={() => handlePackageStateEnabledToggle(!packageStateEnabled)}
                className={`shrink-0 relative inline-flex h-7 w-14 items-center rounded-full transition-colors cursor-pointer ${packageStateEnabled ? 'bg-blue-600 hover:bg-blue-700' : 'bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600'}`}
              >
                <span
                  className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition-transform ${packageStateEnabled ? 'translate-x-8' : 'translate-x-1'}`}
                />
              </button>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-end gap-2 border-slate-100 dark:border-slate-800">
            <button
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-white text-sm font-medium transition-all duration-200 disabled:opacity-60 cursor-pointer ${
                success ? 'bg-green-600 hover:bg-green-700' : 'bg-blue-600 hover:bg-blue-700'
              }`}
              onClick={onSave}
              disabled={saving || !!success}
              type="button"
            >
              {success && <Check size={16} />}
              {success ? '保存しました' : '設定を保存'}
            </button>
          </div>
        </div>
      </section>

      <section className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
        <div className="px-6 py-3 border-b border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50 flex items-center gap-2">
          <FolderOpen size={18} className="text-slate-500 dark:text-slate-400" />
          <h3 className="font-bold text-sm text-slate-700 dark:text-slate-200">データ管理</h3>
        </div>
        <div className="p-6 space-y-6">
          <div className="space-y-3">
            <div className="text-sm font-medium">パッケージ一覧のエクスポート / インポート</div>
            <div className="flex flex-wrap gap-2">
              <button
                className="flex items-center gap-2 px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 text-sm hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer"
                onClick={handleExport}
                disabled={syncBusy}
                type="button"
              >
                <Download size={16} />
                エクスポート
              </button>
              <button
                className="flex items-center gap-2 px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 text-sm hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer"
                onClick={handleImport}
                disabled={syncBusy}
                type="button"
              >
                <Upload size={16} />
                インポート
              </button>
            </div>
            {syncStatus && <div className="text-xs text-slate-500 dark:text-slate-400">{syncStatus}</div>}
          </div>
        </div>
      </section>

      <section className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
        <div className="px-6 py-3 border-b border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50 flex items-center gap-2">
          <Info size={18} className="text-slate-500 dark:text-slate-400" />
          <h3 className="font-bold text-sm text-slate-700 dark:text-slate-200">アプリ情報</h3>
        </div>
        <div className="p-5 space-y-4">
          <div className="flex justify-between items-center text-sm">
            <span className="text-slate-500 dark:text-slate-400">バージョン</span>
            <span className="font-medium">{appVersion || '-'}</span>
          </div>
          <div className="space-y-2">
            <div className="flex justify-between items-center text-sm">
              <span className="text-slate-500 dark:text-slate-400">ライセンス</span>
              <span className="font-medium">MIT License</span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
              本ソフトウェアは MIT License に基づき提供されます。ライセンス全文は LICENSE.txt をご参照ください。
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}

function normalizeInstalledImport(data) {
  const parsed = installedImportSchema.safeParse(data);
  if (!parsed.success) {
    throw new Error('インポートファイルの形式が正しくありません。');
  }
  const normalized = parsed.data;

  if (Array.isArray(normalized)) {
    const out = {};
    normalized.forEach((id) => {
      const key = String(id || '').trim();
      if (key) out[key] = '';
    });
    return out;
  }
  const out = {};
  for (const [rawKey, rawValue] of Object.entries(normalized)) {
    const key = String(rawKey || '').trim();
    if (!key) continue;
    out[key] = rawValue == null ? '' : String(rawValue);
  }
  return out;
}
