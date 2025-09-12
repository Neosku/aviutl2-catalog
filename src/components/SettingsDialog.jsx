// 設定ダイアログコンポーネント
import React, { useEffect, useState } from 'react';
import { getSettings, setSettings, detectInstalledVersionsMap, logError } from '../app/utils.js';
import { useCatalog, useCatalogDispatch } from '../app/store/catalog.jsx';

// 設定ダイアログコンポーネント
// アプリの各種パス設定やテーマ設定を管理
export default function SettingsDialog({ open, onClose }) {
  const { items } = useCatalog();
  const dispatch = useCatalogDispatch();
  // フォーム状態管理（各設定項目の値）
  const [form, setForm] = useState({ appDir: '', pluginsDir: '', scriptsDir: '', theme: 'noir' });
  // UI状態管理
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [appVersion, setAppVersion] = useState('');

  // ダイアログが開かれた時に現在の設定を読み込み
  useEffect(() => {
    let mounted = true;
    if (open) {
      (async () => {
        setError('');
        try {
          const cur = await getSettings();
          if (mounted) setForm({ appDir: cur.appDir || '', pluginsDir: cur.pluginsDir || '', scriptsDir: cur.scriptsDir || '', theme: cur.theme || 'noir' });
        } catch (e) { try { await logError(`[settings] getSettings failed: ${e?.message || e}`); } catch (_) {} }
        // アプリのバージョン取得
        try {
          const app = await import('@tauri-apps/api/app');
          const v = (app?.getVersion) ? await app.getVersion() : '';
          if (mounted) setAppVersion(String(v || ''));
        } catch (e) { try { await logError(`[settings] getVersion failed: ${e?.message || e}`); } catch (_) {} }
      })();
    }
    return () => { mounted = false; };
  }, [open]);

  // フォーム入力値の変更処理
  function onChange(e) {
    const { name, value } = e.target;
    setForm(prev => ({ ...prev, [name]: value }));
    // テーマ変更時はリアルタイムでプレビュー適用
    if (name === 'theme') {
      try { document.documentElement.setAttribute('data-theme', String(value || 'noir')); } catch (_) {}
    }
  }

  // ディレクトリ選択ダイアログを開く
  async function pickDir(field, title) {
    try {
      const dialog = await import('@tauri-apps/plugin-dialog');
      const p = await dialog.open({ directory: true, multiple: false, title });
      if (p) setForm(prev => ({ ...prev, [field]: String(p) }));
    } catch (e) { setError('ディレクトリ選択に失敗しました'); }
  }

  // 設定保存処理
  async function onSave() {
    setSaving(true);
    setError('');
    try {
      await setSettings({ appDir: form.appDir.trim(), pluginsDir: form.pluginsDir.trim(), scriptsDir: form.scriptsDir.trim() || undefined, theme: (form.theme || 'noir').trim() });
      try { document.documentElement.setAttribute('data-theme', (form.theme || 'noir').trim()); } catch (_) {}
      // 新しいパスを使って再検出処理を実行
      try {
        const detected = await detectInstalledVersionsMap(items || []);
        dispatch({ type: 'SET_DETECTED_MAP', payload: detected });
      } catch (_) {  }
      onClose?.();
    } catch (e) {
      setError('保存に失敗しました。権限やパスをご確認ください。');
    } finally {
      setSaving(false);
    }
  }
  // ダイアログが閉じている場合は何も表示しない
  if (!open) return null;

  return (
    <div className="modal" role="dialog" aria-modal="true" aria-labelledby="settings-title">
      <div className="modal__backdrop" onClick={onClose} />
      <div className="modal__dialog">
        <div className="modal__header">
          <h3 id="settings-title" className="modal__title">設定</h3>
        </div>
        <div className="modal__body">
          {/* エラーメッセージ表示 */}
          {error && <div className="error" role="alert">{error}</div>}
          <div className="form" style={{ gap: 10 }}>
            {/* アプリ本体フォルダ設定 */}
            <label>アプリ本体フォルダ（appDir）
              <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: 8 }}>
                <input name="appDir" value={form.appDir} onChange={onChange} />
                <button className="btn" type="button" onClick={() => pickDir('appDir', 'AviUtl2 のルートフォルダ')}>参照</button>
              </div>
              <small className="form__help">AviUtl2 の実行ファイル（aviutl2.exe）があるフォルダです。例: C:\\Program Files\\AviUtl2</small>
            </label>
            {/* プラグインフォルダ設定 */}
            <label>プラグインフォルダ（pluginsDir）
              <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: 8 }}>
                <input name="pluginsDir" value={form.pluginsDir} onChange={onChange} />
                <button className="btn" type="button" onClick={() => pickDir('pluginsDir', 'Plugins フォルダ')}>参照</button>
              </div>
              <small className="form__help">AviUtl2 の plugins フォルダ。プラグインのインストール・更新・削除に使用します。</small>
            </label>
            {/* スクリプトフォルダ設定 */}
            <label>スクリプトフォルダ（任意）
              <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: 8 }}>
                <input name="scriptsDir" value={form.scriptsDir} onChange={onChange} />
                <button className="btn" type="button" onClick={() => pickDir('scriptsDir', 'Scripts フォルダ')}>参照</button>
              </div>
              <small className="form__help">AviUtl2 の script フォルダ（未設定でも可）。スクリプトの配置や検出に使用されます。</small>
            </label>
            {/* テーマ設定 */}
            <label>テーマ（Theme）
              <select name="theme" value={form.theme} onChange={onChange}>
                <option value="darkmode">Dark mode</option>
                <option value="lightmode">Light mode</option>
                {/* 非採用のテーマオプション
                <option value="midnight">Midnight (Blue Dark)</option>
                <option value="slate">Slate (Neutral Dark)</option>
                <option value="emerald">Emerald</option>
                <option value="aubergine">Aubergine</option>
                <option value="ocean">Ocean</option>
                <option value="mono">Monochrome</option>
                <option value="paper">Paper (Warm Light)</option>
                <option value="snow">Snow (Cool Light)</option>
                <option value="linen">Linen (Ivory Light)</option> */}
              </select>
            </label>
          </div>
          <div style={{ marginTop: 8, color: 'var(--muted)' }}>アプリのバージョン: {appVersion || '取得中…'}</div>
        </div>
        <div className="modal__actions">
          <button className="btn" onClick={onClose}>閉じる</button>
          <button className="btn btn--primary" onClick={onSave} disabled={saving}>{saving ? (<><span className="spinner" aria-hidden></span> 保存中…</>) : '保存'}</button>
        </div>
      </div>
    </div>
  );
}
