// 設定ダイアログコンポーネント
import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { getSettings, detectInstalledVersionsMap, loadInstalledMap, saveInstalledSnapshot, runInstallerForItem, runUninstallerForItem, hasInstaller, logError } from '../app/utils.js';
import { useCatalog, useCatalogDispatch } from '../app/store/catalog.jsx';
import { invoke } from '@tauri-apps/api/core';
import Icon from './Icon.jsx';

// テーマ選択肢の定義
const THEME_OPTIONS = [
  {
    value: 'darkmode',
    label: 'ダークモード',
    icon: 'moon',
  },
  {
    value: 'lightmode',
    label: 'ライトモード',
    icon: 'sun',
  },
];

export default function SettingsDialog({ open, onClose }) {
  const { items } = useCatalog();
  const dispatch = useCatalogDispatch();
  const initialThemeAttrRef = useRef(null);
  const didSaveRef = useRef(false);

  // 入力は aviutl2Root / isPortableMode / theme のみ
  const [form, setForm] = useState({
    aviutl2Root: '',
    isPortableMode: false,
    theme: 'darkmode',
  });

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [appVersion, setAppVersion] = useState('');
  const [themeDropdownOpen, setThemeDropdownOpen] = useState(false);
  const themeDropdownRef = useRef(null);
  const [syncBusy, setSyncBusy] = useState(false);
  const [syncStatus, setSyncStatus] = useState('');

  // インストール状態インポートデータの正規化
  function normalizeInstalledImport(data) {
    if (Array.isArray(data)) {
      const out = {};
      data.forEach((id) => {
        const key = String(id || '').trim();
        if (key) out[key] = '';
      });
      return out;
    }
    if (!data || typeof data !== 'object') {
      throw new Error('インポートファイルの形式が正しくありません。');
    }
    const out = {};
    for (const [rawKey, rawValue] of Object.entries(data)) {
      const key = String(rawKey || '').trim();
      if (!key) continue;
      out[key] = rawValue == null ? '' : String(rawValue);
    }
    return out;
  }
  // エクスポートボタン押下時の処理
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
      } catch (_) { }
    } catch (e) {
      setError('エクスポートに失敗しました。\n権限や保存先を確認してください。');
      try { await logError(`[settings] export failed: ${e?.message || e}`); } catch (_) { }
    } finally {
      setSyncBusy(false);
      setSyncStatus('');
    }
  }

  // インポートボタン押下時の処理
  async function handleImport() {
    if (syncBusy) return;
    setError('');
    setSyncBusy(true);
    setSyncStatus('インポート準備中…');
    try {
      const dialog = await import('@tauri-apps/plugin-dialog');
      const ok = await dialog.confirm(
        'インポート内容に合わせてパッケージをインストール/削除します。\n続行しますか？',
        { title: 'インポート', kind: 'warning' },
      );
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
      } catch (e) {
        throw new Error('インポートファイルのJSONを読み込めませんでした。');
      }
      const targetMap = normalizeInstalledImport(parsed);
      const targetIds = Object.keys(targetMap);
      if (!targetIds.length) throw new Error('インポートファイルの内容が空です。');
      const targetIdSet = new Set(targetIds);

      const catalogItems = Array.isArray(items) ? items : [];
      if (!catalogItems.length) throw new Error('カタログ情報が読み込まれていません。');

      const idToItem = new Map(catalogItems.map((item) => [String(item.id), item]));
      const unknownIds = targetIds.filter(id => !idToItem.has(id));

      setSyncStatus('インストール状態を検出中…');
      const detected = await detectInstalledVersionsMap(catalogItems);
      const currentIds = Object.entries(detected || {})
        .filter(([, v]) => v)
        .map(([id]) => id);

      const toInstall = targetIds.filter(id => idToItem.has(id) && !detected?.[id]);
      const toRemove = currentIds.filter(id => !targetIdSet.has(id));

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
      const hasIssues = unknownIds.length || skippedInstall.length || skippedRemove.length || failedInstall.length || failedRemove.length;
      try {
        await dialog.message(summary.join('\n'), {
          title: 'インポート結果',
          kind: hasIssues ? 'warning' : 'info',
        });
      } catch (_) { }
    } catch (e) {
      setError(e?.message ? String(e.message) : 'インポートに失敗しました。');
      try { await logError(`[settings] import failed: ${e?.message || e}`); } catch (_) { }
    } finally {
      setSyncBusy(false);
      setSyncStatus('');
    }
  }

  function applyThemeAttr(theme) {
    const root = document?.documentElement;
    if (!root) return;
    if (theme == null) {
      root.removeAttribute('data-theme');
      return;
    }
    const value = String(theme).trim();
    if (!value || value === 'darkmode' || value === 'noir') {
      root.removeAttribute('data-theme');
      return;
    }
    if (value === 'lightmode') {
      root.setAttribute('data-theme', 'lightmode');
      return;
    }
    root.setAttribute('data-theme', value);
  }

  useEffect(() => {
    if (!open) return undefined;
    didSaveRef.current = false;
    initialThemeAttrRef.current = document?.documentElement?.getAttribute('data-theme');

    // ドロップダウンを閉じる処理
    function handleClickOutside(e) {
      if (themeDropdownRef.current && !themeDropdownRef.current.contains(e.target)) {
        setThemeDropdownOpen(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      if (!didSaveRef.current) {
        applyThemeAttr(initialThemeAttrRef.current);
      }
    };
  }, [open]);

  useEffect(() => {
    let mounted = true;
    if (open) {
      (async () => {
        setError('');

        // 1) すべての設定を getSettings() から取得（aviutl2_root / is_portable_mode / theme）
        try {
          const cur = await getSettings();
          console.log('[settings] current settings:', cur);
          if (mounted) {
            const theme = String(cur?.theme || 'darkmode');
            const aviutl2Root = String(cur?.aviutl2_root || '');
            const isPortableMode = !!cur?.is_portable_mode;

            setForm(prev => ({
              ...prev,
              theme,
              aviutl2Root,
              isPortableMode,
            }));

            // HTML に現在のテーマを即時反映
            try { applyThemeAttr(theme); } catch (_) { }
          }
        } catch (e) {
          try { await logError(`[settings] getSettings failed: ${e?.message || e}`); } catch (_) { }
        }

        // 2) アプリのバージョン
        try {
          const app = await import('@tauri-apps/api/app');
          const v = (app?.getVersion) ? await app.getVersion() : '';
          if (mounted) setAppVersion(String(v || ''));
        } catch (e) {
          try { await logError(`[settings] getVersion failed: ${e?.message || e}`); } catch (_) { }
        }
      })();
    }
    return () => { mounted = false; };
  }, [open]);

  useEffect(() => {
    const body = document?.body;
    if (!body) return undefined;
    if (open) {
      body.classList.add('is-modal-open');
    } else {
      body.classList.remove('is-modal-open');
    }
    return () => {
      body.classList.remove('is-modal-open');
    };
  }, [open]);

  function onChange(e) {
    const { name, value, type, checked } = e.target;
    const v = (type === 'checkbox') ? !!checked : value;
    setForm(prev => ({ ...prev, [name]: v }));
    if (name === 'theme') {
      try { applyThemeAttr(String(v || 'darkmode')); } catch (_) { }
    }
  }

  function handlePortableToggle(next) {
    setForm(prev => ({ ...prev, isPortableMode: !!next }));
  }

  async function pickDir(field, title) {
    try {
      const dialog = await import('@tauri-apps/plugin-dialog');
      const p = await dialog.open({ directory: true, multiple: false, title });
      if (p) setForm(prev => ({ ...prev, [field]: String(p) }));
    } catch (e) { setError('ディレクトリ選択に失敗しました'); }
  }

  async function onSave() {
    setSaving(true);
    setError('');
    try {
      // 1) 入力パスの解決
      const resolved = await invoke('resolve_aviutl2_root', { raw: String(form.aviutl2Root || '') });
      const aviutl2Root = String(resolved || '').trim();
      if (!aviutl2Root) throw new Error('AviUtl2 のフォルダを指定してください。');

      // 2) Rust 側へ保存（settings.json も更新）
      await invoke('update_settings', {
        aviutl2Root,
        isPortableMode: !!form.isPortableMode,
        theme: (form.theme || 'darkmode').trim(),
      });

      // 3) テーマはフロント設定として反映
      try { applyThemeAttr((form.theme || 'darkmode').trim()); } catch (_) { }
      didSaveRef.current = true;
      try {
        initialThemeAttrRef.current = document?.documentElement?.getAttribute('data-theme');
      } catch (_) { }

      // 4) 再検出（UI 反映）
      try {
        const detected = await detectInstalledVersionsMap(items || []);
        dispatch({ type: 'SET_DETECTED_MAP', payload: detected });
      } catch (_) { }

      onClose?.();
    } catch (e) {
      setError(e?.message ? String(e.message) : '保存に失敗しました。権限やパスをご確認ください。');
      try { await logError(`[settings] save failed: ${e?.message || e}`); } catch (_) { }
    } finally {
      setSaving(false);
    }
  }

  if (!open) return null;

  function handleClose() {
    if (saving || syncBusy) return;
    if (!didSaveRef.current) {
      try { applyThemeAttr(initialThemeAttrRef.current); } catch (_) { }
    }
    try { document?.body?.classList?.remove('is-modal-open'); } catch (_) { }
    setThemeDropdownOpen(false);
    onClose?.();
  }

  function handleThemeSelect(value) {
    setForm(prev => ({ ...prev, theme: value }));
    try { applyThemeAttr(String(value || 'darkmode')); } catch (_) { }
    setThemeDropdownOpen(false);
  }

  const selectedTheme = THEME_OPTIONS.find(opt => opt.value === form.theme) || THEME_OPTIONS[0];

  const content = (
    <div className="modal" role="dialog" aria-modal="true" aria-labelledby="settings-title">
      <div className="modal__backdrop" onClick={handleClose} />
      <div className="modal__dialog">
        <div className="modal__header">
          <h3 id="settings-title" className="modal__title">設定</h3>
        </div>
        <div className="modal__body modal__body--compact">
          {error && <div className="error" role="alert">{error}</div>}

          <div className="form" style={{ gap: 10 }}>
            {/* AviUtl2 ルート */}
            <label>AviUtl2 ルート（aviutl2.exeのあるフォルダを選択してください）
              <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: 8 }}>
                <input
                  name="aviutl2Root"
                  value={form.aviutl2Root}
                  onChange={onChange}
                  placeholder="例: C:\\Program Files\\AviUtl2"
                />
                <button className="btn" type="button" onClick={() => pickDir('aviutl2Root', 'AviUtl2 のルートフォルダ')}>参照</button>
              </div>
            </label>

            {/* ポータブルモード */}
            <div
              className="settings-toggle"
              role="group"
              aria-labelledby="settings-portable-mode"
            >
              <div className="settings-toggle__label" id="settings-portable-mode">ポータブルモード</div>
              <div className="settings-toggle__options">
                <button
                  type="button"
                  className={`btn btn--toggle ${!form.isPortableMode ? 'is-active' : ''}`}
                  aria-pressed={!form.isPortableMode}
                  onClick={() => handlePortableToggle(false)}
                >
                  オフ
                  <span className="setup-checkbox__option-badge">推奨</span>
                </button>
                <button
                  type="button"
                  className={`btn btn--toggle ${form.isPortableMode ? 'is-active' : ''}`}
                  aria-pressed={!!form.isPortableMode}
                  onClick={() => handlePortableToggle(true)}
                >
                  オン
                </button>
              </div>
              <p className="settings-toggle__description">
                オフ（推奨）: AviUtl2 の設定やプラグインは ProgramData フォルダに保存されます。<br />
                オン　　　　: aviutl2.exe と同じディレクトリに保存されます。
              </p>
            </div>

            {/* テーマ */}
            <label>テーマ
              <div className="theme-select" ref={themeDropdownRef}>
                <button
                  type="button"
                  className="theme-select__button"
                  onClick={() => setThemeDropdownOpen(!themeDropdownOpen)}
                  aria-expanded={themeDropdownOpen}
                  aria-haspopup="listbox"
                  aria-labelledby="theme-label"
                >
                  <div className="theme-select__current">
                    <div className="theme-select__icon">
                      <Icon name={selectedTheme.icon} size={18} />
                    </div>
                    <div className="theme-select__label">
                      {selectedTheme.label}
                    </div>
                  </div>
                  <div className="theme-select__arrow">
                    <Icon name="chevron_down" size={18} />
                  </div>
                </button>
                <div className={`theme-select__dropdown ${themeDropdownOpen ? 'is-open' : ''}`} role="listbox">
                  {THEME_OPTIONS.map((option) => (
                    <button
                      key={option.value}
                      type="button"
                      className={`theme-select__option ${option.value === form.theme ? 'is-selected' : ''}`}
                      onClick={() => handleThemeSelect(option.value)}
                      role="option"
                      aria-selected={option.value === form.theme}
                    >
                      <div className="theme-select__option-icon">
                        <Icon name={option.icon} size={18} />
                      </div>
                      <div className="theme-select__option-content">
                        <div className="theme-select__option-label">{option.label}</div>
                      </div>
                      <div className="theme-select__option-check">
                        <Icon name="check" size={18} />
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            </label>

            <div className="settings-backup" role="group" aria-labelledby="settings-backup-label">
              <div className="settings-backup__label" id="settings-backup-label">パッケージ一覧のエクスポート/インポート</div>
              <div className="settings-backup__actions">
                <button className="btn" type="button" onClick={handleExport} disabled={saving || syncBusy}>
                  {syncBusy ? (<><span className="spinner" aria-hidden></span>実行中…</>) : 'エクスポート'}
                </button>
                <button className="btn" type="button" onClick={handleImport} disabled={saving || syncBusy}>
                  インポート
                </button>
              </div>
              {!syncBusy && (
                <span className="form__help">
                  インポート時は一覧のパッケージのインストールと一覧にないパッケージの削除を行います。
                </span>
              )}
              {syncStatus && (
                <span className="form__help">
                  {syncBusy && <span className="spinner" aria-hidden></span>}
                  {syncStatus}
                </span>
              )}
            </div>
          </div>

          <div style={{ marginTop: 8, color: 'var(--muted)' }}>
            アプリのバージョン: {appVersion || '取得中…'}
          </div>
          <div style={{ marginTop: 12, color: 'var(--muted)', fontSize: '12px' }}>
            本ソフトウェアは MIT License に基づき提供されます。ライセンス全文は LICENSE.txt をご参照ください。
          </div>
        </div>

        <div className="modal__actions">
          <button className="btn" onClick={handleClose} disabled={saving || syncBusy}>閉じる</button>
          <button className="btn btn--primary" onClick={onSave} disabled={saving || syncBusy}>
            {saving ? (<><span className="spinner" aria-hidden></span> 保存中…</>) : '保存'}
          </button>
        </div>
      </div>
    </div>
  );

  return createPortal(content, document.body);
}
