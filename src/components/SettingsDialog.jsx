// 設定ダイアログコンポーネント
import React, { useEffect, useState } from 'react';
import { getSettings, detectInstalledVersionsMap, logError } from '../app/utils.js';
import { useCatalog, useCatalogDispatch } from '../app/store/catalog.jsx';
import { invoke } from '@tauri-apps/api/core';

export default function SettingsDialog({ open, onClose }) {
  const { items } = useCatalog();
  const dispatch = useCatalogDispatch();

  // 入力は aviutl2Root / isPortableMode / theme のみ
  const [form, setForm] = useState({
    aviutl2Root: '',
    isPortableMode: false,
    theme: 'darkmode',
  });

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [appVersion, setAppVersion] = useState('');

  useEffect(() => {
    let mounted = true;
    if (open) {
      (async () => {
        setError('');

        // 1) フロント側設定（テーマ）
        try {
          const cur = await getSettings();
          if (mounted) {
            const theme = String(cur?.theme || 'darkmode');
            setForm(prev => ({ ...prev, theme }));
            try { document.documentElement.setAttribute('data-theme', theme); } catch (_) {}
          }
        } catch (e) { try { await logError(`[settings] getSettings failed: ${e?.message || e}`); } catch (_) {} }

        // 2) Rust 側の現在の aviutl2_root を取得して初期表示に反映
        try {
          const map = /** @type {Record<string,string>} */ (await invoke('get_app_dirs')) || {};
          if (mounted && map.aviutl2_root) {
            setForm(prev => ({ ...prev, aviutl2Root: map.aviutl2_root }));
          }
        } catch (e) { try { await logError(`[settings] get_app_dirs failed: ${e?.message || e}`); } catch (_) {} }

        // 3) アプリのバージョン
        try {
          const app = await import('@tauri-apps/api/app');
          const v = (app?.getVersion) ? await app.getVersion() : '';
          if (mounted) setAppVersion(String(v || ''));
        } catch (e) { try { await logError(`[settings] getVersion failed: ${e?.message || e}`); } catch (_) {} }
      })();
    }
    return () => { mounted = false; };
  }, [open]);

  function onChange(e) {
    const { name, value, type, checked } = e.target;
    const v = (type === 'checkbox') ? !!checked : value;
    setForm(prev => ({ ...prev, [name]: v }));
    if (name === 'theme') {
      try { document.documentElement.setAttribute('data-theme', String(v || 'darkmode')); } catch (_) {}
    }
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

      // 2) Rust 側へ保存＆ APP_DIR 更新（settings.json も更新）
      await invoke('update_settings', {
        aviutl2Root,
        isPortableMode: !!form.isPortableMode,
        theme: (form.theme || 'dark').trim()
      });

      // 3) テーマはフロント設定として保存
      try { document.documentElement.setAttribute('data-theme', (form.theme || 'darkmode').trim()); } catch (_) {}

      // 4) 再検出（UI 反映）
      try {
        const detected = await detectInstalledVersionsMap(items || []);
        dispatch({ type: 'SET_DETECTED_MAP', payload: detected });
      } catch (_) {}

      onClose?.();
    } catch (e) {
      setError(e?.message ? String(e.message) : '保存に失敗しました。権限やパスをご確認ください。');
      try { await logError(`[settings] save failed: ${e?.message || e}`); } catch (_) {}
    } finally {
      setSaving(false);
    }
  }

  if (!open) return null;

  return (
    <div className="modal" role="dialog" aria-modal="true" aria-labelledby="settings-title">
      <div className="modal__backdrop" onClick={onClose} />
      <div className="modal__dialog">
        <div className="modal__header">
          <h3 id="settings-title" className="modal__title">設定</h3>
        </div>
        <div className="modal__body">
          {error && <div className="error" role="alert">{error}</div>}

          <div className="form" style={{ gap: 10 }}>
            {/* AviUtl2 ルート */}
            <label>AviUtl2 ルート（aviutl2.exeのあるフォルダを選択してください）
              <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: 8 }}>
                <input
                  name="aviutl2Root"
                  value={form.aviutl2Root}
                  onChange={onChange}
                  placeholder="例: C:\Program Files\AviUtl2"
                />
                <button className="btn" type="button" onClick={() => pickDir('aviutl2Root', 'AviUtl2 のルートフォルダ')}>参照</button>
              </div>
              {/* <small className="form__help">aviutl2.exeがあるフォルダを指定してください</small> */}
            </label>

            {/* ポータブルモード */}
            <label style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <input type="checkbox" name="isPortableMode" checked={!!form.isPortableMode} onChange={onChange} />
              ポータブルモードを使用する（プラグインやスクリプトをdataフォルダに保存します）
            </label>

            {/* テーマ */}
            <label>テーマ（Theme）
              <select name="theme" value={form.theme} onChange={onChange}>
                <option value="darkmode">Dark mode</option>
                <option value="lightmode">Light mode</option>
              </select>
            </label>
          </div>

          <div style={{ marginTop: 8, color: 'var(--muted)' }}>
            アプリのバージョン: {appVersion || '取得中…'}
          </div>
        </div>

        <div className="modal__actions">
          <button className="btn" onClick={onClose}>閉じる</button>
          <button className="btn btn--primary" onClick={onSave} disabled={saving}>
            {saving ? (<><span className="spinner" aria-hidden></span> 保存中…</>) : '保存'}
          </button>
        </div>
      </div>
    </div>
  );
}
