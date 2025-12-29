// 設定ダイアログコンポーネント
import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { getSettings, detectInstalledVersionsMap, logError } from '../app/utils.js';
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
          </div>

          <div style={{ marginTop: 8, color: 'var(--muted)' }}>
            アプリのバージョン: {appVersion || '取得中…'}
          </div>
          <div style={{ marginTop: 12, color: 'var(--muted)' , fontSize: '12px' }}>
            本ソフトウェアは MIT License に基づき提供されます。ライセンス全文は LICENSE.txt をご参照ください。
          </div>
        </div>

        <div className="modal__actions">
          <button className="btn" onClick={handleClose}>閉じる</button>
          <button className="btn btn--primary" onClick={onSave} disabled={saving}>
            {saving ? (<><span className="spinner" aria-hidden></span> 保存中…</>) : '保存'}
          </button>
        </div>
      </div>
    </div>
  );

  return createPortal(content, document.body);
}
