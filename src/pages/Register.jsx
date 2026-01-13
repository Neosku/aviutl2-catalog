
import React, { useCallback, useEffect, useMemo, useRef, useState, useDeferredValue, memo } from 'react';
import { getCurrentWindow } from '@tauri-apps/api/window';
import { readFile } from '@tauri-apps/plugin-fs';
import { open } from '@tauri-apps/plugin-shell';
// パッケージ登録フォーム。
import Icon from '../components/Icon.jsx';
import PackageCard from '../components/PackageCard.jsx';
import { renderMarkdown } from '../app/markdown.js';
import { useCatalog } from '../app/store/catalog.jsx';
import { getSettings } from '../app/utils.js';
import { LICENSE_TEMPLATES, LICENSE_TYPE_OPTIONS, buildLicenseBody } from '../constants/licenseTemplates.js';

// インストーラ関連で許可されるアクションやラベル定義
const INSTALL_ACTIONS = ['download', 'extract', 'run', 'copy'];
const SPECIAL_INSTALL_ACTIONS = ['extract_sfx', 'run_auo_setup'];
const UNINSTALL_ACTIONS = ['delete', 'run'];
const ID_PATTERN = /^[A-Za-z0-9._-]+$/;
const ACTION_LABELS = {
  download: 'ダウンロード',
  extract: 'ZIP展開',
  copy: 'コピー',
  run: 'EXE実行',
  delete: '削除',
  extract_sfx: '7zを展開',
  run_auo_setup: 'auo_setup2.exeを実行',
};
const INSTALLER_SOURCES = [
  { value: 'direct', label: '直接URL' },
  { value: 'github', label: 'GitHub Release' },
  { value: 'GoogleDrive', label: 'Google Drive' },
  { value: 'booth', label: 'BOOTH' },
];
const SUBMIT_ACTIONS = {
  package: 'plugin',
};
const PACKAGE_GUIDE_FALLBACK_URL = 'https://github.com/Neosku/aviutl2-catalog-data/blob/main/register-package.md';
const LICENSE_TEMPLATE_TYPES = new Set(Object.keys(LICENSE_TEMPLATES));
// ステップ選択で使う選択肢（ラベルを毎回手書きしないために先に展開）
const INSTALL_ACTION_OPTIONS = INSTALL_ACTIONS.map(action => ({ value: action, label: ACTION_LABELS[action] || action }));
const UNINSTALL_ACTION_OPTIONS = UNINSTALL_ACTIONS.map(action => ({ value: action, label: ACTION_LABELS[action] || action }));

// UIで安定したkeyを作るための簡易ID生成
function generateKey() {
  return Math.random().toString(36).slice(2, 10);
}

// 共通の配列/文字列ユーティリティ群
function normalizeArrayText(values = []) {
  return (Array.isArray(values) ? values : []).map(v => String(v || '').trim()).filter(Boolean);
}

function commaListToArray(text) {
  return String(text || '')
    .split(',')
    .map(v => v.trim())
    .filter(Boolean);
}

function arrayToCommaList(arr) {
  return normalizeArrayText(arr).join(', ');
}

function isMarkdownPath(value) {
  return typeof value === 'string' && /\.md$/i.test(value.trim());
}

function buildPreviewUrl(src, baseUrl) {
  if (!src) return '';
  if (!baseUrl) return src;
  return resolveRelativeUrl(src, baseUrl);
}

function revokePreviewUrl(url) {
  if (typeof url === 'string' && url.startsWith('blob:')) {
    try { URL.revokeObjectURL(url); } catch (_) { /* ignore */ }
  }
}

function cleanupImagePreviews(images) {
  if (!images) return;
  if (images.thumbnail?.previewUrl) revokePreviewUrl(images.thumbnail.previewUrl);
  if (Array.isArray(images.info)) {
    images.info.forEach(entry => {
      if (entry?.previewUrl) revokePreviewUrl(entry.previewUrl);
    });
  }
}

function resolveBaseUrl(rawUrl) {
  if (!rawUrl) return null;
  try {
    const absolute = new URL(rawUrl, (typeof window !== 'undefined' && window.location && window.location.href) || 'app://localhost/');
    return new URL('.', absolute).toString();
  } catch (_) {
    const stripped = String(rawUrl).split(/[?#]/)[0];
    const idx = stripped.lastIndexOf('/');
    if (idx >= 0) {
      return stripped.slice(0, idx + 1);
    }
    return null;
  }
}

function resolveRelativeUrl(rawPath, baseUrl) {
  if (!rawPath) return '';
  if (!baseUrl) return rawPath;
  try {
    return new URL(rawPath, baseUrl).toString();
  } catch (_) {
    return rawPath;
  }
}

function basename(path) {
  if (typeof path !== 'string') return '';
  const parts = path.split(/[/\\]/);
  return parts[parts.length - 1] || path;
}

// シンプルなカスタムセレクト（WebView標準のプルダウンを避ける）
const ActionSelect = memo(function ActionSelect({ value, onChange, options, ariaLabel }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  const normalized = Array.isArray(options) ? options : [];
  const selected = normalized.find(opt => opt.value === value) || normalized[0] || { value: '', label: '' };
  const dropdownOptions = normalized.filter(opt => opt.value !== '');

  useEffect(() => {
    // ドロップダウン外をクリックしたら閉じる
    function handleClickOutside(e) {
      if (ref.current && !ref.current.contains(e.target)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    // 選択値が変わったらドロップダウンを閉じる
    setOpen(false);
  }, [value]);

  function choose(val) {
    setOpen(false);
    onChange?.(val);
  }

  function onKeyDown(e) {
    if (e.key === 'Escape') setOpen(false);
  }

  return (
    <div className="relative min-w-[140px]" ref={ref} onKeyDown={onKeyDown}>
      <button
        type="button"
        className={`flex w-full items-center justify-between gap-2 rounded-lg border px-3 py-2 text-sm shadow-sm transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 ${open
          ? 'border-blue-500 ring-2 ring-blue-500/20 z-10'
          : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:hover:border-slate-600 dark:hover:bg-slate-700'
          }`}
        onClick={() => setOpen(prev => !prev)}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={ariaLabel}
      >
        <span className="truncate text-slate-700 dark:text-slate-200">{selected?.label || value}</span>
        <span className={`text-slate-400 transition-transform duration-200 ${open ? 'rotate-180' : ''}`} aria-hidden>
          <Icon name="chevron_down" size={16} />
        </span>
      </button>
      {open && (
        <div className="absolute left-0 right-0 z-50 mt-1 max-h-60 overflow-y-auto rounded-xl border border-slate-200 bg-white p-1 shadow-xl ring-1 ring-slate-900/5 dark:border-slate-700 dark:bg-slate-800 dark:ring-white/10" role="listbox">
          {dropdownOptions.map(opt => (
            <button
              type="button"
              key={opt.value}
              className={`flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-sm transition-colors ${opt.value === value
                ? 'bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300'
                : 'text-slate-600 hover:bg-slate-50 dark:text-slate-300 dark:hover:bg-slate-700/50'
                }`}
              role="option"
              aria-selected={opt.value === value}
              onMouseDown={e => { e.preventDefault(); choose(opt.value); }}
            >
              <span className="truncate">{opt.label}</span>
              {opt.value === value && <Icon name="check" size={14} />}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}, (prev, next) => (
  prev.value === next.value
  && prev.ariaLabel === next.ariaLabel
  && prev.options === next.options
));

// 空のインストーラ、バージョン、パッケージ入力の初期値を生成
function createEmptyInstaller() {
  return {
    sourceType: 'direct',
    directUrl: '',
    boothUrl: '',
    githubOwner: '',
    githubRepo: '',
    githubPattern: '',
    googleDriveId: '',
    installSteps: [],
    uninstallSteps: [],
  };
}

function createEmptyVersionFile() {
  return {
    key: generateKey(),
    path: '',
    hash: '',
    fileName: '',
  };
}

function createEmptyVersion() {
  const now = new Date();
  const today = new Intl.DateTimeFormat('ja-JP', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    timeZone: 'Asia/Tokyo'
  }).format(now).replace(/\//g, '-');
  return {
    key: generateKey(),
    version: '',
    release_date: today,
    files: [createEmptyVersionFile()],
  };
}

function createEmptyCopyright() {
  return {
    key: generateKey(),
    years: '',
    holder: '',
  };
}

function createEmptyLicense() {
  return {
    key: generateKey(),
    type: '',
    licenseName: '',
    isCustom: false,
    licenseBody: '',
    copyrights: [createEmptyCopyright()],
  };
}

function createEmptyPackageForm() {
  return {
    id: '',
    name: '',
    author: '',
    originalAuthor: '',
    type: '',
    summary: '',
    descriptionText: '',
    descriptionPath: '',
    repoURL: '',
    licenses: [createEmptyLicense()],
    dependenciesText: '',
    installer: createEmptyInstaller(),
    versions: [],
    images: {
      thumbnail: null,
      info: [],
    },
  };
}

const DeleteButton = memo(function DeleteButton({ onClick, ariaLabel = '削除', title }) {
  return (
    <button
      type="button"
      className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 transition-colors hover:bg-red-50 hover:text-red-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500 dark:text-slate-500 dark:hover:bg-red-900/20 dark:hover:text-red-400"
      aria-label={ariaLabel}
      title={title || ariaLabel}
      onClick={onClick}
    >
      <Icon name="trash_2" size={18} />
    </button>
  );
});

// タグ入力と候補選択をローカルステートで完結させる軽量エディタ
const TagEditor = memo(function TagEditor({ initialTags, suggestions = [], onChange }) {
  const [tags, setTags] = useState(() => normalizeArrayText(initialTags));
  const [inputValue, setInputValue] = useState('');
  const inputRef = useRef(null);

  // 親からの初期タグ変更時だけ同期し、入力中の再レンダーを抑える
  useEffect(() => {
    const normalized = normalizeArrayText(initialTags);
    setTags(normalized);
    setInputValue('');
  }, [initialTags]);

  const handleAddTagsFromInput = useCallback((text) => {
    const parts = String(text || '')
      .split(',')
      .map(v => v.trim())
      .filter(Boolean);
    if (!parts.length) {
      setInputValue('');
      return;
    }
    const next = [...tags];
    let updated = false;
    parts.forEach(tag => {
      if (!next.includes(tag)) {
        next.push(tag);
        updated = true;
      }
    });
    if (updated) {
      setTags(next);
      onChange?.(next);
    }
    setInputValue('');
  }, [tags, onChange]);

  const handleToggleTag = useCallback((tag) => {
    if (tags.includes(tag)) {
      const next = tags.filter(t => t !== tag);
      setTags(next);
      onChange?.(next);
      return;
    }
    handleAddTagsFromInput(tag);
  }, [handleAddTagsFromInput, onChange, tags]);

  const handleRemoveTag = useCallback((tag) => {
    const next = tags.filter(t => t !== tag);
    setTags(next);
    onChange?.(next);
  }, [tags, onChange]);

  const handleTagInputKeyDown = useCallback((e) => {
    if (e.key !== 'Enter') return;
    e.preventDefault();
    handleAddTagsFromInput(inputValue);
  }, [handleAddTagsFromInput, inputValue]);

  return (
    <div className="space-y-2">
      <label className="text-sm font-medium text-slate-700 dark:text-slate-300">タグ</label>
      <div
        className="flex min-h-[42px] flex-wrap items-center gap-2 rounded-lg border border-slate-200 bg-white p-1.5 shadow-sm transition focus-within:ring-2 focus-within:ring-blue-500 dark:border-slate-700 dark:bg-slate-800"
        onClick={() => inputRef.current?.focus()}
      >
        {tags.map(tag => (
          <span key={tag} className="inline-flex animate-in fade-in zoom-in duration-200 items-center gap-1 rounded-md bg-slate-100 px-2 py-1 text-sm font-medium text-slate-700 dark:bg-slate-700 dark:text-slate-200">
            <span className="max-w-[160px] truncate">{tag}</span>
            <button type="button" className="ml-0.5 inline-flex h-4 w-4 items-center justify-center rounded-full text-slate-400 hover:bg-slate-200 hover:text-slate-600 dark:hover:bg-slate-600 dark:hover:text-slate-200" onClick={(e) => { e.stopPropagation(); handleRemoveTag(tag); }} aria-label={`${tag} を削除`}>
              <Icon name="x" size={12} />
            </button>
          </span>
        ))}
        <input
          ref={inputRef}
          name="tags"
          className="min-w-[120px] flex-1 border-0 bg-transparent p-1 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-0 dark:text-slate-100"
          value={inputValue}
          onChange={e => setInputValue(e.target.value)}
          onKeyDown={handleTagInputKeyDown}
          aria-label="タグを入力"
          placeholder={tags.length === 0 ? "タグを入力 (Enterで追加)" : ""}
        />
      </div>
      {suggestions.length > 0 && (
        <div className="rounded-xl border border-dashed border-slate-200 bg-white/70 p-3 text-sm text-slate-600 dark:border-slate-800 dark:bg-slate-900/50">
          <div className="text-xs font-semibold uppercase tracking-wider text-slate-400">既存タグ</div>
          <div className="mt-2 flex flex-wrap gap-2">
            {suggestions.map(tag => {
              const isSelected = tags.includes(tag);
              return (
                <button
                  type="button"
                  key={tag}
                  className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium transition-all ${isSelected
                    ? 'bg-blue-100 text-blue-700 ring-1 ring-blue-500/20 dark:bg-blue-900/30 dark:text-blue-300 dark:ring-blue-500/40'
                    : 'bg-white text-slate-600 ring-1 ring-slate-200 hover:bg-slate-50 hover:text-slate-900 dark:bg-slate-800 dark:text-slate-300 dark:ring-slate-700 dark:hover:bg-slate-700'
                    }`}
                  onClick={() => handleToggleTag(tag)}
                >
                  <span>{tag}</span>
                  {isSelected && <Icon name="check" size={12} />}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
});

const PackageLicenseSection = memo(function PackageLicenseSection({
  license,
  onUpdateLicenseField,
  onToggleTemplate,
  onUpdateCopyright,
}) {
  const activeLicense = license || createEmptyLicense();
  const type = activeLicense.type;
  const isOtherType = type === 'その他';
  const isUnknown = type === '不明';
  const forceBodyInput = isOtherType;
  const useTemplate = !forceBodyInput && !isUnknown && !activeLicense.isCustom;
  const needsCopyrightInput = useTemplate && type !== 'CC0-1.0';
  const showBodyInput = forceBodyInput || (!isUnknown && !useTemplate);
  const templatePreview = useTemplate ? buildLicenseBody(activeLicense) : '';
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    setCopied(false);
  }, [templatePreview, activeLicense.key]);

  // クリップボードにプレビュー本文をコピー
  async function handleCopyPreview(e) {
    e.preventDefault();
    e.stopPropagation();
    if (!templatePreview) return;
    try {
      await navigator.clipboard.writeText(templatePreview);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (_) { }
  }
  return (
    <section className="space-y-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-lg font-bold text-slate-800 dark:text-slate-100">ライセンス</h2>
      </div>
      <div className="space-y-4">
        <div key={activeLicense.key} className="space-y-5 rounded-xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="grid gap-5 md:grid-cols-2">
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-700 dark:text-slate-300">種類<span className="text-red-500">*</span></label>
              <ActionSelect
                value={activeLicense.type}
                onChange={val => onUpdateLicenseField(activeLicense.key, 'type', val)}
                options={[{ value: '', label: '選択してください' }, ...LICENSE_TYPE_OPTIONS]}
                ariaLabel="ライセンスの種類を選択"
              />
            </div>
            {isOtherType && (
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700 dark:text-slate-300">ライセンス名<span className="text-red-500">*</span></label>
                <input
                  value={activeLicense.licenseName}
                  onChange={e => onUpdateLicenseField(activeLicense.key, 'licenseName', e.target.value)}
                  placeholder="ライセンス名を入力してください"
                  required
                />
                <p className="text-xs text-slate-500 dark:text-slate-400">カスタムライセンスの場合は「カスタムライセンス」と入力してください。</p>
              </div>
            )}
            {!isUnknown && !isOtherType && (
              <div className="relative flex items-end pb-1">
                <label className="flex cursor-pointer items-center gap-3 text-sm font-medium text-slate-700 dark:text-slate-300">
                  <input
                    type="checkbox"
                    className="peer sr-only"
                    checked={useTemplate}
                    onChange={e => onToggleTemplate(activeLicense.key, e.target.checked)}
                    disabled={forceBodyInput}
                  />
                  <div className="relative inline-flex h-6 w-11 flex-none items-center rounded-full bg-slate-200 transition-colors peer-focus-visible:ring-2 peer-focus-visible:ring-blue-500 peer-checked:bg-blue-600 dark:bg-slate-700">
                    <span className={`absolute left-1 h-4 w-4 rounded-full bg-white shadow-sm transition-transform ${useTemplate ? 'translate-x-5' : ''}`} />
                  </div>
                  <span>テンプレートを使用する</span>
                </label>
              </div>
            )}
          </div>
          {showBodyInput ? (
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-700 dark:text-slate-300">
                ライセンス本文{forceBodyInput ? <span className="text-red-500">*</span> : ''}
              </label>
              <textarea
                className="min-h-[160px] font-mono text-xs leading-relaxed"
                value={activeLicense.licenseBody}
                onChange={e => onUpdateLicenseField(activeLicense.key, 'licenseBody', e.target.value)}
                placeholder="ライセンス本文を入力してください"
                required={forceBodyInput}
              />
            </div>
          ) : isUnknown ? (
            null
          ) : (
            needsCopyrightInput ? (
              <div className="rounded-lg bg-blue-50 px-3 py-2 text-xs text-blue-700 dark:bg-blue-900/20 dark:text-blue-200">
                テンプレートを使用します。著作権年と著作権者を入力してください。
              </div>
            ) : null
          )}
          {useTemplate && (
            <div className="space-y-4">
              {needsCopyrightInput && (
                activeLicense.copyrights.map(copyright => (
                  <div key={copyright.key} className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-slate-700 dark:text-slate-300">著作権年</label>
                      <input value={copyright.years} onChange={e => onUpdateCopyright(activeLicense.key, copyright.key, 'years', e.target.value)} placeholder="(例: 2025)" />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-slate-700 dark:text-slate-300">著作権者</label>
                      <input value={copyright.holder} onChange={e => onUpdateCopyright(activeLicense.key, copyright.key, 'holder', e.target.value)} placeholder="(例: KENくん)" />
                    </div>
                  </div>
                ))
              )}
              <div className="overflow-hidden rounded-xl border border-slate-200 bg-slate-50 dark:border-slate-800 dark:bg-slate-800/50">
                <details className="group" open>
                  <summary className="flex cursor-pointer items-center justify-between bg-white px-4 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800">
                    <span>プレビュー</span>
                    <div className="flex items-center gap-2">
                      {copied && <span className="text-xs font-medium text-emerald-600 dark:text-emerald-400 animate-in fade-in slide-in-from-right-1">コピーしました</span>}
                      <button
                        type="button"
                        className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 transition hover:bg-slate-100 hover:text-slate-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 disabled:opacity-50 dark:text-slate-500 dark:hover:bg-slate-800 dark:hover:text-slate-300"
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          handleCopyPreview(e);
                        }}
                        disabled={!templatePreview}
                        aria-label="ライセンス本文をコピー"
                        title="クリップボードにコピー"
                      >
                        <Icon name={copied ? "check" : "copy"} size={16} />
                      </button>
                      <span className="text-slate-400 transition-transform group-open:rotate-180">
                        <Icon name="chevron_down" size={16} />
                      </span>
                    </div>
                  </summary>
                  <div className="border-t border-slate-200 px-4 py-3 dark:border-slate-800">
                    {templatePreview ? (
                      <pre className="max-h-64 overflow-auto whitespace-pre-wrap font-mono text-[11px] leading-relaxed text-slate-600 dark:text-slate-300">{templatePreview}</pre>
                    ) : (
                      <p className="text-xs text-slate-500 dark:text-slate-400">プレビューは種類と著作権者を入力すると表示されます。</p>
                    )}
                  </div>
                </details>
              </div>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}, (prev, next) => (
  prev.license === next.license
  && prev.onUpdateLicenseField === next.onUpdateLicenseField
  && prev.onToggleTemplate === next.onToggleTemplate
  && prev.onUpdateCopyright === next.onUpdateCopyright
));

const PackageImagesSection = memo(function PackageImagesSection({
  images,
  packageId,
  onThumbnailChange,
  onRemoveThumbnail,
  onAddInfoImages,
  onRemoveInfoImage,
}) {
  const thumbnailRef = useRef(null);
  const infoRef = useRef(null);
  const [isDraggingOverThumbnail, setIsDraggingOverThumbnail] = useState(false);
  const [isDraggingOverInfo, setIsDraggingOverInfo] = useState(false);

  useEffect(() => {
    let unlistenDragDrop = null;
    let unlistenDragEnter = null;
    let unlistenDragOver = null;
    let unlistenDragLeave = null;

    const setupDragDrop = async () => {
      try {
        const appWindow = getCurrentWindow();

        // Helper to check if point (x, y) is inside rect
        const isInside = (rect, x, y) => {
          if (!rect) return false;
          // Tauri's drag-drop position is in logical pixels (CSS pixels).
          return x >= rect.left && x <= rect.right && y >= rect.top && y <= rect.bottom;
        };

        // Helper to handle file reading
        const processDroppedFiles = async (paths) => {
          const files = [];
          for (const p of paths) {
            try {
              const bytes = await readFile(p);
              const name = basename(p);
              // Simple mime type deduction
              const ext = getFileExtension(name) || 'bin';
              let type = 'application/octet-stream';
              if (['png', 'jpg', 'jpeg', 'gif', 'webp', 'svg'].includes(ext)) type = `image/${ext}`;

              const file = new File([bytes], name, { type });
              files.push(file);
            } catch (err) {
              console.error(`Failed to read dropped file: ${p}`, err);
            }
          }
          return files;
        };

        const handleDragEvent = (event, type) => {
          const { position } = event.payload;
          const thumbRect = thumbnailRef.current?.getBoundingClientRect();
          const infoRect = infoRef.current?.getBoundingClientRect();

          const overThumbnail = isInside(thumbRect, position.x, position.y);
          const overInfo = isInside(infoRect, position.x, position.y);

          if (type === 'drop') {
            const { paths } = event.payload;
            if (overThumbnail && paths.length > 0) {
              processDroppedFiles([paths[0]]).then(files => {
                if (files.length > 0) onThumbnailChange(files[0]);
              });
            } else if (overInfo && paths.length > 0) {
              processDroppedFiles(paths).then(files => {
                if (files.length > 0) onAddInfoImages(files);
              });
            }
            setIsDraggingOverThumbnail(false);
            setIsDraggingOverInfo(false);
          } else if (type === 'enter' || type === 'over') {
            setIsDraggingOverThumbnail(overThumbnail);
            setIsDraggingOverInfo(overInfo);
          } else {
            setIsDraggingOverThumbnail(false);
            setIsDraggingOverInfo(false);
          }
        };

        // User requested "tauri/api/windowのonDragDropEvent()"
        // We use listen('tauri://drag-drop') which is the v2 equivalent for window file drops.
        unlistenDragDrop = await appWindow.listen('tauri://drag-drop', e => handleDragEvent(e, 'drop'));
        unlistenDragEnter = await appWindow.listen('tauri://drag-enter', e => handleDragEvent(e, 'enter'));
        unlistenDragOver = await appWindow.listen('tauri://drag-over', e => handleDragEvent(e, 'over'));
        unlistenDragLeave = await appWindow.listen('tauri://drag-leave', e => handleDragEvent(e, 'leave'));

      } catch (err) {
        console.error('Failed to setup drag and drop listeners', err);
      }
    };

    setupDragDrop();

    return () => {
      if (unlistenDragDrop) unlistenDragDrop();
      if (unlistenDragEnter) unlistenDragEnter();
      if (unlistenDragOver) unlistenDragOver();
      if (unlistenDragLeave) unlistenDragLeave();
    };
  }, [onThumbnailChange, onAddInfoImages]);

  const thumbnailPreview = images.thumbnail?.previewUrl || images.thumbnail?.existingPath || '';
  return (
    <section className="space-y-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-lg font-bold text-slate-800 dark:text-slate-100">画像</h2>
      </div>
      <div className="grid gap-6 lg:grid-cols-3">
        {/* サムネイル */}
        <div
          ref={thumbnailRef}
          className={`space-y-3 rounded-xl border p-5 shadow-sm transition-colors ${isDraggingOverThumbnail
            ? 'border-blue-500 bg-blue-50 ring-2 ring-blue-500/20 dark:bg-blue-900/20'
            : 'border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900'
            }`}
        >
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h3 className="text-sm font-bold text-slate-700 dark:text-slate-200">サムネイル</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">パッケージ一覧に表示します (1枚)</p>
              <p className="text-[11px] text-blue-500 dark:text-blue-400">
                ※推奨：縦横比1:1 (206×206px前後)<br />
                一覧を見やすくするため、可能であればご登録ください
              </p>
            </div>
            <label className="relative inline-flex cursor-pointer items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-700 transition hover:bg-slate-100 focus-within:ring-2 focus-within:ring-blue-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700">
              <Icon name="image_plus" size={16} />
              <span>画像を選択</span>
              <input
                type="file"
                accept="image/*"
                onChange={e => {
                  const file = e.target.files?.[0];
                  if (file) onThumbnailChange(file);
                  e.target.value = '';
                }}
                className="sr-only"
              />
            </label>
          </div>
          {isDraggingOverThumbnail ? (
            <div className="flex h-52 items-center justify-center rounded-xl border-2 border-dashed border-blue-500 bg-blue-100/50 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400">
              <div className="text-center">
                <Icon name="download" size={32} className="mx-auto mb-2 animate-bounce" />
                <span className="text-sm font-bold">ここにドロップして追加</span>
              </div>
            </div>
          ) : images.thumbnail ? (
            <div className="group flex flex-col overflow-hidden rounded-xl border border-slate-200 bg-slate-50 dark:border-slate-800 dark:bg-slate-800/50">
              <div className="relative aspect-square w-full bg-slate-100 dark:bg-slate-900">
                <div
                  className={`absolute inset-0 flex items-center justify-center bg-contain bg-center bg-no-repeat text-xs text-transparent ${thumbnailPreview ? '' : 'text-slate-400'}`}
                  style={thumbnailPreview ? { backgroundImage: `url(${thumbnailPreview})` } : undefined}
                >
                  {!thumbnailPreview && <span>プレビューなし</span>}
                </div>
                <div className="absolute inset-0 bg-black/0 transition-colors group-hover:bg-black/10" />
              </div>
              <div className="flex items-center justify-between gap-2 border-t border-slate-100 bg-white px-3 py-2 dark:border-slate-800 dark:bg-slate-900">
                <span className="truncate text-xs font-medium text-slate-700 dark:text-slate-300" title={images.thumbnail.file?.name || images.thumbnail.existingPath}>
                  {images.thumbnail.file?.name || images.thumbnail.existingPath || '未設定'}
                </span>
                <DeleteButton onClick={onRemoveThumbnail} ariaLabel="サムネイルを削除" />
              </div>
            </div>
          ) : (
            <div className="flex h-52 flex-col items-center justify-center rounded-xl border-2 border-dashed border-slate-200 bg-slate-50 text-slate-400 dark:border-slate-700 dark:bg-slate-900/50">
              <Icon name="image" size={32} className="mb-2 opacity-50" />
              <span className="text-xs font-medium">サムネイルが未設定です</span>
              <span className="text-[10px] opacity-70 mt-1">画像をドラッグ＆ドロップ</span>
            </div>
          )}
        </div>

        {/* 説明画像 */}
        <div
          ref={infoRef}
          className={`flex flex-col space-y-3 rounded-xl border p-5 shadow-sm transition-colors lg:col-span-2 ${isDraggingOverInfo
            ? 'border-blue-500 bg-blue-50 ring-2 ring-blue-500/20 dark:bg-blue-900/20'
            : 'border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900'
            }`}
        >
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h3 className="text-sm font-bold text-slate-700 dark:text-slate-200">説明画像</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">パッケージ詳細ページに表示する説明画像 (複数可)</p>
              <p className="text-[10px] text-blue-500 dark:text-blue-400">※縦横比は16:9を推奨します</p>
            </div>
            <label className="relative inline-flex cursor-pointer items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-700 transition hover:bg-slate-100 focus-within:ring-2 focus-within:ring-blue-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700">
              <Icon name="images" size={16} />
              <span>画像を追加</span>
              <input
                type="file"
                accept="image/*"
                multiple
                onChange={e => {
                  const files = e.target.files;
                  if (files?.length) onAddInfoImages(files);
                  e.target.value = '';
                }}
                className="sr-only"
              />
            </label>
          </div>
          {isDraggingOverInfo ? (
            <div className="flex flex-1 min-h-[13rem] items-center justify-center rounded-xl border-2 border-dashed border-blue-500 bg-blue-100/50 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400">
              <div className="text-center">
                <Icon name="download" size={32} className="mx-auto mb-2 animate-bounce" />
                <span className="text-sm font-bold">ここにドロップして追加</span>
              </div>
            </div>
          ) : images.info.length ? (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-2 xl:grid-cols-3">
              {images.info.map((entry, idx) => {
                const preview = entry.previewUrl || entry.existingPath || '';
                const filename = entry.file?.name || entry.existingPath || `./image/${packageId}_${idx + 1}.(拡張子)`;
                return (
                  <div key={entry.key} className="group flex flex-col overflow-hidden rounded-xl border border-slate-200 bg-slate-50 dark:border-slate-800 dark:bg-slate-800/50">
                    <div className="relative aspect-video w-full bg-slate-100 dark:bg-slate-900">
                      <div
                        className={`absolute inset-0 flex items-center justify-center bg-contain bg-center bg-no-repeat text-xs text-transparent ${preview ? '' : 'text-slate-400'}`}
                        style={preview ? { backgroundImage: `url(${preview})` } : undefined}
                      >
                        {!preview && <span>No Preview</span>}
                      </div>
                      <div className="absolute inset-0 bg-black/0 transition-colors group-hover:bg-black/10" />
                      <div className="absolute top-1 right-1 opacity-0 transition-opacity group-hover:opacity-100">
                        <button
                          type="button"
                          className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-white/90 text-red-600 shadow-sm backdrop-blur-sm transition hover:bg-red-50 hover:text-red-700 dark:bg-slate-900/90 dark:text-red-400 dark:hover:bg-red-900/40"
                          onClick={() => onRemoveInfoImage(entry.key)}
                          aria-label="削除"
                        >
                          <Icon name="trash_2" size={14} />
                        </button>
                      </div>
                    </div>
                    <div className="border-t border-slate-100 bg-white px-2 py-1.5 dark:border-slate-800 dark:bg-slate-900">
                      <p className="truncate text-[10px] font-medium text-slate-700 dark:text-slate-300" title={filename}>{filename}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="flex flex-1 min-h-[13rem] flex-col items-center justify-center rounded-xl border-2 border-dashed border-slate-200 bg-slate-50 text-slate-400 dark:border-slate-700 dark:bg-slate-900/50">
              <Icon name="image" size={32} className="mb-2 opacity-50" />
              <span className="text-xs font-medium">説明画像が未設定です</span>
              <span className="text-[10px] opacity-70 mt-1">画像をドラッグ＆ドロップ</span>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}, (prev, next) => (
  prev.images === next.images
  && prev.packageId === next.packageId
  && prev.onThumbnailChange === next.onThumbnailChange
  && prev.onRemoveThumbnail === next.onRemoveThumbnail
  && prev.onAddInfoImages === next.onAddInfoImages
  && prev.onRemoveInfoImage === next.onRemoveInfoImage
));

const PackageInstallerSection = memo(function PackageInstallerSection({
  installer,
  installListRef,
  uninstallListRef,
  addInstallStep,
  addUninstallStep,
  removeInstallStep,
  removeUninstallStep,
  startHandleDrag,
  updateInstallStep,
  updateInstallerField,
  updateUninstallStep,
}) {
  return (
    <section className="space-y-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-lg font-bold text-slate-800 dark:text-slate-100">インストーラ</h2>
      </div>
      <div className="space-y-4">
        <div className="space-y-2">
          <label className="text-sm font-medium text-slate-700 dark:text-slate-300">ダウンロード元</label>
          <div className="flex flex-wrap gap-1 rounded-xl border border-slate-200 bg-slate-50 p-1 dark:border-slate-800 dark:bg-slate-800/50">
            {INSTALLER_SOURCES.map(option => {
              const isActive = installer.sourceType === option.value;
              return (
                <button
                  key={option.value}
                  type="button"
                  className={`flex-1 rounded-lg px-3 py-2 text-xs font-semibold transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 ${isActive
                    ? 'bg-white text-blue-600 shadow-sm dark:bg-slate-800 dark:text-blue-400'
                    : 'text-slate-600 hover:bg-slate-200/50 dark:text-slate-400 dark:hover:bg-slate-800/50'
                    }`}
                  onClick={() => updateInstallerField('sourceType', option.value)}
                >
                  {option.label}
                </button>
              );
            })}
          </div>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
          {installer.sourceType === 'direct' && (
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-700 dark:text-slate-300">ダウンロードURL</label>
              <input value={installer.directUrl} onChange={e => updateInstallerField('directUrl', e.target.value)} placeholder="https://example.com/plugin.zip" />
            </div>
          )}
          {installer.sourceType === 'booth' && (
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-700 dark:text-slate-300">BOOTH URL</label>
              <input value={installer.boothUrl} onChange={e => updateInstallerField('boothUrl', e.target.value)} placeholder="https://booth.pm/downloadables/...で始まるパス" />
            </div>
          )}
          {installer.sourceType === 'github' && (
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700 dark:text-slate-300">GitHub ID (Owner)</label>
                <input value={installer.githubOwner} onChange={e => updateInstallerField('githubOwner', e.target.value)} placeholder="例: neosku" />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700 dark:text-slate-300">レポジトリ名 (Repo)</label>
                <input value={installer.githubRepo} onChange={e => updateInstallerField('githubRepo', e.target.value)} placeholder="例: aviutl2-catalog" />
              </div>
              <div className="space-y-2 md:col-span-2">
                <label className="text-sm font-medium text-slate-700 dark:text-slate-300">正規表現パターン</label>
                <input value={installer.githubPattern} onChange={e => updateInstallerField('githubPattern', e.target.value)} placeholder="^aviutl_plugin_.*\\.zip$" />
                <p className="text-xs text-slate-500 dark:text-slate-400">リリースファイル名に一致する正規表現を指定してください。</p>
              </div>
            </div>
          )}
          {installer.sourceType === 'GoogleDrive' && (
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-700 dark:text-slate-300">ファイルID</label>
              <input value={installer.googleDriveId} onChange={e => updateInstallerField('googleDriveId', e.target.value)} placeholder="Google Drive の共有リンクに含まれるID（…/drive/folders/{フォルダID}）" />
            </div>
          )}
        </div>
      </div>

      <div className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h3 className="text-base font-bold text-slate-800 dark:text-slate-100">インストール手順</h3>
          <button type="button" className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-700 transition hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700" onClick={addInstallStep}>
            <Icon name="plus" size={14} />
            <span>ステップを追加</span>
          </button>
        </div>
        <div
          className="space-y-3"
          ref={installListRef}
        >
          {installer.installSteps.map((step, idx) => {
            const order = idx + 1;
            const isSpecialAction = SPECIAL_INSTALL_ACTIONS.includes(step.action);
            return (
              <div
                key={step.key}
                className="step-card group relative space-y-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm transition hover:border-slate-300 dark:border-slate-800 dark:bg-slate-900 dark:hover:border-slate-700"
              >
                <div className="flex flex-wrap items-center gap-3">
                  <div className="flex items-center gap-2">
                    <span className="inline-flex h-6 w-6 items-center justify-center rounded-md bg-slate-100 text-xs font-bold text-slate-600 dark:bg-slate-800 dark:text-slate-300">{order}</span>
                    {!isSpecialAction && (
                      <span
                        className="cursor-grab text-slate-300 hover:text-slate-500 active:cursor-grabbing dark:text-slate-600 dark:hover:text-slate-400"
                        role="button"
                        tabIndex={0}
                        onPointerDown={e => startHandleDrag('install', idx, e)}
                        aria-label="ドラッグして並び替え"
                      >
                        <Icon name="grip_vertical" size={16} />
                      </span>
                    )}
                  </div>
                  <div className="flex-1 min-w-[120px]">
                    {isSpecialAction ? (
                      <div className="flex items-center gap-2 rounded-lg bg-slate-50 px-3 py-2 text-sm font-semibold text-slate-700 dark:bg-slate-800 dark:text-slate-200">
                        {ACTION_LABELS[step.action] || step.action}
                        <span className="ml-auto text-xs font-normal text-slate-400">固定ステップ</span>
                      </div>
                    ) : (
                      <ActionSelect
                        value={step.action}
                        onChange={(val) => updateInstallStep(step.key, 'action', val)}
                        options={INSTALL_ACTION_OPTIONS}
                        ariaLabel="ステップの種類を選択"
                      />
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    {!isSpecialAction && (
                      <DeleteButton onClick={() => removeInstallStep(step.key)} ariaLabel="ステップを削除" />
                    )}
                  </div>
                </div>
                {!isSpecialAction && step.action === 'run' && (
                  <div className="grid gap-3 rounded-lg bg-slate-50 p-3 dark:bg-slate-800/50 md:grid-cols-2">
                    <div className="space-y-1">
                      <label className="text-xs font-medium text-slate-600 dark:text-slate-400">実行パス</label>
                      <input value={step.path} onChange={e => updateInstallStep(step.key, 'path', e.target.value)} placeholder="{tmp}/setup.exe" className="!bg-white dark:!bg-slate-800" />
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs font-medium text-slate-600 dark:text-slate-400">引数 (カンマ区切り)</label>
                      <input value={step.argsText} onChange={e => updateInstallStep(step.key, 'argsText', e.target.value)} placeholder="--silent, --option" className="!bg-white dark:!bg-slate-800" />
                    </div>
                    <div className="md:col-span-2">
                      <label className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-700 shadow-sm transition hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800">
                        <input
                          type="checkbox"
                          className="accent-blue-600"
                          checked={!!step.elevate}
                          onChange={e => updateInstallStep(step.key, 'elevate', e.target.checked)}
                        />
                        <span>管理者権限で実行する</span>
                      </label>
                    </div>
                  </div>
                )}
                {!isSpecialAction && step.action === 'copy' && (
                  <div className="grid gap-3 rounded-lg bg-slate-50 p-3 dark:bg-slate-800/50 md:grid-cols-2">
                    <div className="space-y-1">
                      <label className="text-xs font-medium text-slate-600 dark:text-slate-400">コピー元</label>
                      <input value={step.from} onChange={e => updateInstallStep(step.key, 'from', e.target.value)} placeholder="（例：{tmp}/example.auo）" className="!bg-white dark:!bg-slate-800" />
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs font-medium text-slate-600 dark:text-slate-400">コピー先</label>
                      <input value={step.to} onChange={e => updateInstallStep(step.key, 'to', e.target.value)} placeholder="（例：{pluginsDir}）" className="!bg-white dark:!bg-slate-800" />
                    </div>
                  </div>
                )}
              </div>
            );
          })}
          {!installer.installSteps.length && (
            <div className="flex h-24 flex-col items-center justify-center rounded-xl border-2 border-dashed border-slate-200 bg-slate-50 text-slate-400 dark:border-slate-800 dark:bg-slate-800/50">
              <span className="text-xs">ステップを追加してインストール手順を定義してください</span>
            </div>
          )}
        </div>
      </div>

      <div className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h3 className="text-base font-bold text-slate-800 dark:text-slate-100">アンインストール手順</h3>
          <button type="button" className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-700 transition hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700" onClick={addUninstallStep}>
            <Icon name="plus" size={14} />
            <span>ステップを追加</span>
          </button>
        </div>
        <div
          className="space-y-3"
          ref={uninstallListRef}
        >
          {installer.uninstallSteps.map((step, idx) => {
            const order = idx + 1;
            return (
              <div
                key={step.key}
                className="step-card group relative space-y-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm transition hover:border-slate-300 dark:border-slate-800 dark:bg-slate-900 dark:hover:border-slate-700"
              >
                <div className="flex flex-wrap items-center gap-3">
                  <div className="flex items-center gap-2">
                    <span className="inline-flex h-6 w-6 items-center justify-center rounded-md bg-slate-100 text-xs font-bold text-slate-600 dark:bg-slate-800 dark:text-slate-300">{order}</span>
                    <span
                      className="cursor-grab text-slate-300 hover:text-slate-500 active:cursor-grabbing dark:text-slate-600 dark:hover:text-slate-400"
                      role="button"
                      tabIndex={0}
                      onPointerDown={e => startHandleDrag('uninstall', idx, e)}
                      aria-label="ドラッグして並び替え"
                    >
                      <Icon name="grip_vertical" size={16} />
                    </span>
                  </div>
                  <div className="flex-1 min-w-[120px]">
                    <ActionSelect
                      value={step.action}
                      onChange={(val) => updateUninstallStep(step.key, 'action', val)}
                      options={UNINSTALL_ACTION_OPTIONS}
                      ariaLabel="ステップの種類を選択"
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <DeleteButton onClick={() => removeUninstallStep(step.key)} ariaLabel="ステップを削除" />
                  </div>
                </div>
                <div className="grid gap-3 rounded-lg bg-slate-50 p-3 dark:bg-slate-800/50 md:grid-cols-2">
                  <div className="space-y-1">
                    <label className="text-xs font-medium text-slate-600 dark:text-slate-400">対象パス</label>
                    <input value={step.path} onChange={e => updateUninstallStep(step.key, 'path', e.target.value)} placeholder={step.action === 'delete' ? '(例: {pluginsDir}/example.auo)' : '(例: {appDir}/uninstall.exe)'} className="!bg-white dark:!bg-slate-800" />
                  </div>
                  {step.action === 'run' && (
                    <>
                      <div className="space-y-1">
                        <label className="text-xs font-medium text-slate-600 dark:text-slate-400">引数 (カンマ区切り)</label>
                        <input value={step.argsText} onChange={e => updateUninstallStep(step.key, 'argsText', e.target.value)} placeholder="(例: /VERYSILENT)" className="!bg-white dark:!bg-slate-800" />
                      </div>
                      <div className="md:col-span-2">
                        <label className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-700 shadow-sm transition hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800">
                          <input
                            type="checkbox"
                            className="accent-blue-600"
                            checked={!!step.elevate}
                            onChange={e => updateUninstallStep(step.key, 'elevate', e.target.checked)}
                          />
                          <span>管理者権限で実行する</span>
                        </label>
                      </div>
                    </>
                  )}
                </div>
              </div>
            );
          })}
          {!installer.uninstallSteps.length && (
            <div className="flex h-24 flex-col items-center justify-center rounded-xl border-2 border-dashed border-slate-200 bg-slate-50 text-slate-400 dark:border-slate-800 dark:bg-slate-800/50">
              <span className="text-xs">ステップを追加してアンインストール手順を定義してください</span>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}, (prev, next) => (
  prev.installer === next.installer
  && prev.installListRef === next.installListRef
  && prev.uninstallListRef === next.uninstallListRef
  && prev.addInstallStep === next.addInstallStep
  && prev.addUninstallStep === next.addUninstallStep
  && prev.removeInstallStep === next.removeInstallStep
  && prev.removeUninstallStep === next.removeUninstallStep
  && prev.startHandleDrag === next.startHandleDrag
  && prev.updateInstallStep === next.updateInstallStep
  && prev.updateInstallerField === next.updateInstallerField
  && prev.updateUninstallStep === next.updateUninstallStep
));



const VersionFileCard = memo(function VersionFileCard({
  versionKey,
  file,
  index,
  removeVersionFile,
  updateVersionFile,
  chooseFileForHash,
}) {
  const order = index + 1;
  return (
    <div className="group relative space-y-3 rounded-lg border border-slate-200 bg-slate-50 p-4 transition hover:bg-slate-100/50 dark:border-slate-800 dark:bg-slate-900/50 dark:hover:bg-slate-900">
      <div className="flex items-center justify-between gap-2">
        <span className="inline-flex items-center rounded-md bg-white px-2 py-1 text-xs font-bold text-slate-600 shadow-sm dark:bg-slate-800 dark:text-slate-300">File {order}</span>
        <DeleteButton onClick={() => removeVersionFile(versionKey, file.key)} ariaLabel={`ファイル${order}を削除`} />
      </div>
      <div className="space-y-1">
        <label className="text-xs font-medium text-slate-600 dark:text-slate-400">保存先パス (インストール時)</label>
        <input value={file.path} onChange={e => updateVersionFile(versionKey, file.key, 'path', e.target.value)} placeholder="{pluginsDir}/plugin.dll" className="!bg-white dark:!bg-slate-800" />
      </div>
      <div className="rounded-lg border border-slate-200 bg-white p-3 dark:border-slate-800 dark:bg-slate-800/50">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <dl className="grid gap-1 text-xs">
            <div>
              <dt className="font-semibold text-slate-500 dark:text-slate-400">ハッシュ値 (XXH3_128)</dt>
              <dd className={`font-mono ${file.hash ? 'text-slate-700 dark:text-slate-300' : 'text-amber-600 dark:text-amber-500'}`}>
                {file.hash ? file.hash : '未計算'}
              </dd>
            </div>
            {file.fileName && (
              <div className="mt-1">
                <dt className="font-semibold text-slate-500 dark:text-slate-400">元ファイル名</dt>
                <dd className="text-slate-600 dark:text-slate-300">{file.fileName}</dd>
              </div>
            )}
          </dl>
          <button
            type="button"
            className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-semibold text-slate-700 transition hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
            onClick={() => chooseFileForHash(versionKey, file.key)}
          >
            <Icon name="file_search" size={14} />
            <span>ファイルを選択して計算</span>
          </button>
        </div>
      </div>
    </div>
  );
}, (prev, next) => (
  prev.file === next.file
  && prev.index === next.index
  && prev.versionKey === next.versionKey
  && prev.removeVersionFile === next.removeVersionFile
  && prev.updateVersionFile === next.updateVersionFile
  && prev.chooseFileForHash === next.chooseFileForHash
));

const VersionItem = memo(function VersionItem({
  version,
  isOpen,
  toggleVersionOpen,
  removeVersion,
  updateVersionField,
  addVersionFile,
  removeVersionFile,
  updateVersionFile,
  chooseFileForHash,
  openDatePicker,
  versionDateRefs,
}) {
  const handleToggle = useCallback((event) => {
    toggleVersionOpen(version.key, event.target.open);
  }, [toggleVersionOpen, version.key]);

  const handleRemove = useCallback((event) => {
    event.preventDefault();
    event.stopPropagation();
    removeVersion(version.key);
  }, [removeVersion, version.key]);

  const handleDateRef = useCallback((el) => {
    if (el) {
      versionDateRefs.current.set(version.key, el);
    } else {
      versionDateRefs.current.delete(version.key);
    }
  }, [versionDateRefs, version.key]);

  return (
    <details open={isOpen} onToggle={handleToggle} className="group rounded-xl border border-slate-200 bg-white shadow-sm transition-all open:ring-2 open:ring-blue-500/20 dark:border-slate-800 dark:bg-slate-900">
      <summary className="flex cursor-pointer items-center justify-between gap-3 px-4 py-3 transition hover:bg-slate-50 dark:hover:bg-slate-800/50">
        <div className="flex items-center gap-3">
          <div className={`flex h-8 w-8 items-center justify-center rounded-lg transition-colors ${isOpen ? 'bg-blue-100 text-blue-600 dark:bg-blue-900/40 dark:text-blue-400' : 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400'}`}>
            <Icon name={isOpen ? "folder_open" : "folder"} size={18} />
          </div>
          <div className="flex flex-col">
            <span className={`text-sm font-bold ${version.version ? 'text-slate-800 dark:text-slate-100' : 'text-slate-400 italic'}`}>
              {version.version || "バージョン未設定"}
            </span>
            <span className="text-xs text-slate-500 dark:text-slate-400">
              {version.release_date ? `公開日: ${version.release_date}` : "公開日未設定"}
            </span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <DeleteButton
            onClick={handleRemove}
            ariaLabel="このバージョンを削除"
          />
          <span className="text-slate-400 transition-transform group-open:rotate-180">
            <Icon name="chevron_down" size={20} />
          </span>
        </div>
      </summary>
      <div className="border-t border-slate-100 p-4 dark:border-slate-800">
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-700 dark:text-slate-300">バージョン名<span className="text-red-500">*</span></label>
            <input value={version.version} onChange={e => updateVersionField(version.key, 'version', e.target.value)} placeholder="v1.0.0" />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-700 dark:text-slate-300">公開日<span className="text-red-500">*</span></label>
            <div className="flex items-center gap-2">
              <input
                type="date"
                max="9999-12-31"
                className="flex-1"
                value={version.release_date}
                onChange={e => updateVersionField(version.key, 'release_date', e.target.value)}
                ref={handleDateRef}
              />
              <button
                type="button"
                className="inline-flex h-[38px] w-[38px] items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-500 transition hover:bg-slate-50 hover:text-slate-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-400 dark:hover:bg-slate-700"
                onClick={() => openDatePicker(version.key)}
                aria-label="カレンダーを開く"
              >
                <Icon name="calendar" size={18} />
              </button>
            </div>
          </div>
        </div>

        <div className="mt-6 space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-2 dark:border-slate-800">
            <div>
              <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100">ファイル構成</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">主要ファイルのハッシュ値を計算してください</p>
            </div>
            <button type="button" className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 transition hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700" onClick={() => addVersionFile(version.key)}>
              <Icon name="plus" size={14} />
              <span>ファイルを追加</span>
            </button>
          </div>
          <div className="space-y-3">
            {version.files.map((file, idx) => (
              <VersionFileCard
                key={file.key}
                versionKey={version.key}
                file={file}
                index={idx}
                removeVersionFile={removeVersionFile}
                updateVersionFile={updateVersionFile}
                chooseFileForHash={chooseFileForHash}
              />
            ))}
            {!version.files.length && <div className="flex h-20 items-center justify-center rounded-lg border border-dashed border-slate-200 bg-slate-50 text-xs text-slate-500 dark:border-slate-800 dark:bg-slate-800/50 dark:text-slate-400">ファイルを追加してください</div>}
          </div>
        </div>
      </div>
    </details>
  );
}, (prev, next) => (
  prev.version === next.version
  && prev.isOpen === next.isOpen
  && prev.toggleVersionOpen === next.toggleVersionOpen
  && prev.removeVersion === next.removeVersion
  && prev.updateVersionField === next.updateVersionField
  && prev.addVersionFile === next.addVersionFile
  && prev.removeVersionFile === next.removeVersionFile
  && prev.updateVersionFile === next.updateVersionFile
  && prev.chooseFileForHash === next.chooseFileForHash
  && prev.openDatePicker === next.openDatePicker
  && prev.versionDateRefs === next.versionDateRefs
));

const PackageVersionSection = memo(function PackageVersionSection({
  versions,
  expandedVersionKeys,
  toggleVersionOpen,
  removeVersion,
  updateVersionField,
  addVersion,
  addVersionFile,
  removeVersionFile,
  updateVersionFile,
  chooseFileForHash,
  openDatePicker,
  versionDateRefs,
}) {
  const [showAll, setShowAll] = useState(false);
  const hiddenCount = versions.length - 3;
  const visibleVersions = showAll ? versions : versions.slice(Math.max(0, versions.length - 3));

  return (
    <section className="space-y-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-lg font-bold text-slate-800 dark:text-slate-100">バージョン履歴</h2>
        <button
          type="button"
          className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-3 py-2 text-xs font-semibold text-white shadow-sm transition hover:bg-blue-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 dark:bg-blue-600 dark:hover:bg-blue-500"
          onClick={addVersion}
        >
          <Icon name="plus" size={16} />
          <span>新しいバージョンを追加</span>
        </button>
      </div>
      <div className="space-y-4">
        {!showAll && hiddenCount > 0 && (
          <button
            type="button"
            className="flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-slate-300 bg-slate-50 py-3 text-xs font-semibold text-slate-500 transition hover:border-blue-400 hover:bg-blue-50 hover:text-blue-600 dark:border-slate-700 dark:bg-slate-800/50 dark:text-slate-400 dark:hover:bg-blue-900/20 dark:hover:text-blue-400"
            onClick={() => setShowAll(true)}
          >
            <Icon name="chevron_up" size={14} />
            <span>以前のバージョン ({hiddenCount}件) を表示</span>
          </button>
        )}
        {visibleVersions.map(ver => (
          <VersionItem
            key={ver.key}
            version={ver}
            isOpen={expandedVersionKeys.has(ver.key)}
            toggleVersionOpen={toggleVersionOpen}
            removeVersion={removeVersion}
            updateVersionField={updateVersionField}
            addVersionFile={addVersionFile}
            removeVersionFile={removeVersionFile}
            updateVersionFile={updateVersionFile}
            chooseFileForHash={chooseFileForHash}
            openDatePicker={openDatePicker}
            versionDateRefs={versionDateRefs}
          />
        ))}
        {!versions.length && (
          <div className="flex h-32 flex-col items-center justify-center rounded-xl border-2 border-dashed border-slate-200 bg-slate-50 text-slate-500 dark:border-slate-800 dark:bg-slate-800/50 dark:text-slate-400">
            <Icon name="history" size={32} className="mb-2 opacity-50" />
            <p className="text-sm font-medium">バージョン情報がありません</p>
            <p className="text-xs opacity-70">右上のボタンから追加してください</p>
          </div>
        )}
      </div>
    </section>
  );
}, (prev, next) => (
  prev.versions === next.versions
  && prev.expandedVersionKeys === next.expandedVersionKeys
  && prev.toggleVersionOpen === next.toggleVersionOpen
  && prev.removeVersion === next.removeVersion
  && prev.updateVersionField === next.updateVersionField
  && prev.addVersion === next.addVersion
  && prev.addVersionFile === next.addVersionFile
  && prev.removeVersionFile === next.removeVersionFile
  && prev.updateVersionFile === next.updateVersionFile
  && prev.chooseFileForHash === next.chooseFileForHash
  && prev.openDatePicker === next.openDatePicker
  && prev.versionDateRefs === next.versionDateRefs
));

function VisibilityBadge({ type = 'public', label }) {
  const text = label || (type === 'public' ? '公開' : '非公開');
  const tone = type === 'public'
    ? 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900/40 dark:bg-emerald-900/20 dark:text-emerald-300'
    : 'border-slate-200 bg-slate-100 text-slate-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300';
  return (
    <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wide ${tone}`}>
      {text}
    </span>
  );
}

function parseInstallerSource(installer = {}) {
  if (!installer || typeof installer !== 'object') return createEmptyInstaller();
  const next = createEmptyInstaller();
  const source = installer.source || {};
  if (source.booth) {
    next.sourceType = 'booth';
    next.boothUrl = String(source.booth || '');
  } else if (source.direct) {
    next.sourceType = 'direct';
    next.directUrl = String(source.direct || '');
  } else if (source.github) {
    next.sourceType = 'github';
    next.githubOwner = String(source.github?.owner || '');
    next.githubRepo = String(source.github?.repo || '');
    next.githubPattern = String(source.github?.pattern || '');
  } else if (source.GoogleDrive) {
    next.sourceType = 'GoogleDrive';
    next.googleDriveId = String(source.GoogleDrive?.id || '');
  }
  const installSteps = Array.isArray(installer.install) ? installer.install : [];
  next.installSteps = installSteps.map(step => {
    const action = step?.action;
    const normalizedAction = INSTALL_ACTIONS.includes(action) || SPECIAL_INSTALL_ACTIONS.includes(action)
      ? action
      : 'download';
    return {
      key: generateKey(),
      action: normalizedAction,
      path: String(step?.path || ''),
      argsText: Array.isArray(step?.args) ? step.args.map(arg => String(arg || '')).filter(Boolean).join(', ') : '',
      from: String(step?.from || ''),
      to: String(step?.to || ''),
      elevate: !!step?.elevate,
    };
  });
  const uninstallSteps = Array.isArray(installer.uninstall) ? installer.uninstall : [];
  next.uninstallSteps = uninstallSteps.map(step => ({
    key: generateKey(),
    action: UNINSTALL_ACTIONS.includes(step?.action) ? step.action : 'delete',
    path: String(step?.path || ''),
    argsText: Array.isArray(step?.args) ? step.args.map(arg => String(arg || '')).filter(Boolean).join(', ') : '',
    elevate: !!step?.elevate,
  }));
  return next;
}

function parseVersions(rawVersions) {
  const arr = Array.isArray(rawVersions) ? rawVersions : [];
  if (!arr.length) return [];
  return arr.map(ver => {
    const files = Array.isArray(ver?.file) ? ver.file : [];
    return {
      key: generateKey(),
      version: String(ver?.version || ''),
      release_date: String(ver?.release_date || ''),
      files: files.length ? files.map(f => ({
        key: generateKey(),
        path: String(f?.path || ''),
        hash: String(f?.XXH3_128 || f?.xxh3_128 || ''),
        fileName: '',
      })) : [createEmptyVersionFile()],
    };
  });
}

function parseImages(rawImages, baseUrl = '') {
  if (!Array.isArray(rawImages) || !rawImages.length) {
    return { thumbnail: null, info: [] };
  }
  const first = rawImages[0] || {};
  const thumbnailPath = typeof first.thumbnail === 'string' ? first.thumbnail : '';
  const thumbnail = thumbnailPath
    ? {
      existingPath: thumbnailPath,
      file: null,
      previewUrl: buildPreviewUrl(thumbnailPath, baseUrl),
      key: generateKey(),
    }
    : null;
  const infoImg = Array.isArray(first.infoImg) ? first.infoImg : [];
  const info = infoImg.map(src => ({
    existingPath: String(src || ''),
    file: null,
    previewUrl: buildPreviewUrl(String(src || ''), baseUrl),
    key: generateKey(),
  }));
  return { thumbnail, info };
}

function parseLicenses(rawLicenses, legacyLicense = '') {
  const list = Array.isArray(rawLicenses) ? rawLicenses : [];
  const target = list[0];
  if (target) {
    const rawType = String(target?.type || '');
    const isUnknown = rawType === '不明';
    const isTemplateType = LICENSE_TEMPLATE_TYPES.has(rawType);
    const type = (isUnknown || isTemplateType) ? rawType : 'その他';
    const licenseName = (!isUnknown && !isTemplateType) ? rawType : '';
    const licenseBody = typeof target?.licenseBody === 'string' ? target.licenseBody : '';
    const isCustom = !!target?.isCustom || type === '不明' || type === 'その他' || !!licenseBody.trim();
    const copyrights = Array.isArray(target?.copyrights) && target.copyrights.length
      ? target.copyrights.slice(0, 1).map(c => ({
        key: generateKey(),
        years: String(c?.years || ''),
        holder: String(c?.holder || ''),
      }))
      : [createEmptyCopyright()];
    return [{
      key: generateKey(),
      type,
      licenseName,
      isCustom,
      licenseBody,
      copyrights,
    }];
  }
  if (legacyLicense) {
    const rawType = String(legacyLicense || '');
    const isUnknown = rawType === '不明';
    const isTemplateType = LICENSE_TEMPLATE_TYPES.has(rawType);
    const type = (isUnknown || isTemplateType) ? rawType : 'その他';
    const licenseName = (!isUnknown && !isTemplateType) ? rawType : '';
    return [{
      ...createEmptyLicense(),
      type,
      licenseName,
      isCustom: false,
    }];
  }
  return [createEmptyLicense()];
}

function entryToForm(item, baseUrl = '') {
  if (!item || typeof item !== 'object') return createEmptyPackageForm();
  const form = createEmptyPackageForm();
  form.id = String(item.id || '');
  form.name = String(item.name || '');
  form.author = String(item.author || '');
  form.originalAuthor = String(item.originalAuthor || '');
  form.type = String(item.type || '');
  form.summary = String(item.summary || '');
  form.descriptionPath = typeof item.description === 'string' ? item.description : '';
  form.descriptionText = (typeof item.description === 'string' && !isMarkdownPath(item.description)) ? item.description : '';
  form.repoURL = String(item.repoURL || '');
  form.licenses = parseLicenses(item.licenses, item.license);
  form.tagsText = arrayToCommaList(item.tags);
  form.dependenciesText = arrayToCommaList(item.dependencies);
  form.installer = parseInstallerSource(item.installer);
  form.versions = parseVersions(item.version || item.versions);
  form.images = parseImages(item.images, baseUrl);
  return form;
}

function getFileExtension(name = '') {
  const idx = name.lastIndexOf('.');
  if (idx <= 0 || idx === name.length - 1) return '';
  return name.slice(idx + 1).toLowerCase();
}

function extractInstallerSource(form) {
  const source = {};
  if (form.installer.sourceType === 'direct' && form.installer.directUrl.trim()) {
    source.direct = form.installer.directUrl.trim();
  } else if (form.installer.sourceType === 'booth' && form.installer.boothUrl.trim()) {
    source.booth = form.installer.boothUrl.trim();
  } else if (form.installer.sourceType === 'github') {
    const owner = form.installer.githubOwner.trim();
    const repo = form.installer.githubRepo.trim();
    const pattern = form.installer.githubPattern.trim();
    if (owner && repo && pattern) {
      source.github = { owner, repo, pattern };
    }
  } else if (form.installer.sourceType === 'GoogleDrive' && form.installer.googleDriveId.trim()) {
    source.GoogleDrive = { id: form.installer.googleDriveId.trim() };
  }
  return source;
}

function serializeInstallStep(step) {
  const payload = { action: step.action };
  if (step.path && step.path.trim()) {
    payload.path = step.path.trim();
  }
  if (step.action === 'run') {
    if (step.argsText) {
      payload.args = step.argsText.split(',').map(v => v.trim()).filter(Boolean);
    }
    if (step.elevate) payload.elevate = true;
  }
  if (step.from && step.from.trim()) {
    payload.from = step.from.trim();
  }
  if (step.to && step.to.trim()) {
    payload.to = step.to.trim();
  }
  return payload;
}

function serializeUninstallStep(step) {
  const payload = { action: step.action };
  if (step.action === 'run') {
    if (step.path) payload.path = step.path;
    if (step.argsText) {
      payload.args = step.argsText.split(',').map(v => v.trim()).filter(Boolean);
    }
    if (step.elevate) payload.elevate = true;
  } else if (step.action === 'delete' && step.path) {
    payload.path = step.path;
  }
  return payload;
}
// インストーラ関連の入力値を index.json 用の形に直す
function buildInstallerPayload(form) {
  const source = extractInstallerSource(form);
  return {
    source,
    install: form.installer.installSteps.map(serializeInstallStep),
    uninstall: form.installer.uninstallSteps.map(serializeUninstallStep),
  };
}

function buildLicensesPayload(form) {
  return (form.licenses || [])
    .map(license => {
      const type = String(license.type || '').trim();
      const licenseName = String(license.licenseName || '').trim();
      const resolvedType = type === 'その他' ? licenseName : type;
      const licenseBody = String(license.licenseBody || '').trim();
      const isCustom = license.isCustom
        || type === '不明'
        || type === 'その他'
        || licenseBody.length > 0;
      const copyrights = Array.isArray(license.copyrights)
        ? license.copyrights
          .map(c => ({
            years: String(c?.years || '').trim(),
            holder: String(c?.holder || '').trim(),
          }))
          .filter(c => c.years && c.holder)
        : [];
      if (!resolvedType) return null;
      return {
        type: resolvedType,
        isCustom,
        copyrights,
        licenseBody: isCustom ? licenseBody : null,
      };
    })
    .filter(Boolean);
}

// 画像設定を index.json 用の構造に変換
function buildImagesPayload(form) {
  const id = form.id.trim();
  const group = {};
  if (form.images.thumbnail) {
    if (form.images.thumbnail.file) {
      const ext = getFileExtension(form.images.thumbnail.file.name) || 'png';
      group.thumbnail = `./image/${id}_thumbnail.${ext}`;
    } else if (form.images.thumbnail.existingPath) {
      group.thumbnail = form.images.thumbnail.existingPath;
    }
  }
  const infoImg = [];
  form.images.info.forEach((entry, idx) => {
    if (entry.file) {
      const ext = getFileExtension(entry.file.name) || 'png';
      infoImg.push(`./image/${id}_${idx + 1}.${ext}`);
    } else if (entry.existingPath) {
      infoImg.push(entry.existingPath);
    }
  });
  if (infoImg.length) {
    group.infoImg = infoImg;
  }
  if (!group.thumbnail && !group.infoImg) return [];
  return [group];
}

function buildVersionPayload(form) {
  return form.versions.map(ver => ({
    version: ver.version.trim(),
    release_date: ver.release_date.trim(),
    file: ver.files.map(f => ({
      path: f.path.trim(),
      XXH3_128: f.hash.trim(),
    })),
  }));
}

// version 配列の末尾を latest-version として同期
function computeLatestVersion(form) {
  if (!form.versions.length) return '';
  const last = form.versions[form.versions.length - 1];
  return last?.version?.trim() || '';
}

async function computeHashFromFile(fileOrPath) {
  if (!fileOrPath) return '';
  const path = typeof fileOrPath === 'string'
    ? fileOrPath
    : (fileOrPath.path || '');
  if (!path) {
    throw new Error('XXH3_128 を計算するにはローカルファイルのパスが必要です。');
  }
  // ハッシュ計算は Tauri 側のコマンドを叩く
  const { invoke } = await import('@tauri-apps/api/core');
  const hex = await invoke('calc_xxh3_hex', { path });
  if (!hex || typeof hex !== 'string') {
    throw new Error('XXH3_128 を計算できませんでした。');
  }
  return hex.toLowerCase();
}

// フォーム入力＋タグ配列から index.json の1エントリを構築
function buildPackageEntry(form, tags) {
  const id = form.id.trim();
  const entry = {
    id,
    name: form.name.trim(),
    type: form.type.trim(),
    summary: form.summary.trim(),
    description: `./md/${id}.md`,
    author: form.author.trim(),
    originalAuthor: form.originalAuthor.trim(),
    repoURL: form.repoURL.trim(),
    'latest-version': computeLatestVersion(form),
    licenses: buildLicensesPayload(form),
    tags: Array.isArray(tags) ? normalizeArrayText(tags) : commaListToArray(form.tagsText),
    dependencies: commaListToArray(form.dependenciesText),
    images: buildImagesPayload(form),
    installer: buildInstallerPayload(form),
    version: buildVersionPayload(form),
  };
  if (!entry.originalAuthor) delete entry.originalAuthor;
  if (!entry.repoURL) entry.repoURL = '';
  if (!entry.licenses.length) entry.licenses = [];
  if (!entry.tags.length) entry.tags = [];
  if (!entry.dependencies.length) entry.dependencies = [];
  return entry;
}

function validatePackageForm(form) {
  if (!form.id.trim()) return 'ID は必須です';
  if (!ID_PATTERN.test(form.id.trim())) return 'ID は英数字・ドット・アンダーバー・ハイフンのみ使用できます';
  if (!form.name.trim()) return 'パッケージ名は必須です';
  if (!form.author.trim()) return '作者名は必須です';
  if (!form.type.trim()) return '種類は必須です';
  if (!form.summary.trim()) return '概要は必須です';
  if (form.summary.trim().length > 35) return '概要は35文字以内で入力してください';
  if (!form.descriptionText.trim()) return '詳細を入力してください';
  if (!form.licenses.length) return 'ライセンスを1件以上追加してください';
  for (const license of form.licenses) {
    const type = String(license.type || '').trim();
    if (!type) return 'ライセンスの種類を選択してください';
    if (type === 'その他' && !String(license.licenseName || '').trim()) return 'ライセンス名を入力してください';
    const needsCustomBody = type === 'その他' || (type !== '不明' && (license.isCustom || (license.licenseBody && license.licenseBody.trim().length > 0)));
    if (needsCustomBody && !String(license.licenseBody || '').trim()) return 'ライセンス本文を入力してください';
    const usesTemplate = type !== '不明' && type !== 'その他' && !license.isCustom;
    const requiresCopyright = usesTemplate && type !== 'CC0-1.0';
    if (requiresCopyright) {
      const entries = Array.isArray(license.copyrights) ? license.copyrights : [];
      const hasCopyright = entries.some(c => String(c?.years || '').trim() && String(c?.holder || '').trim());
      if (!hasCopyright) return '標準ライセンスを使用する場合は著作権者を入力してください';
    }
  }
  const sourceType = form.installer.sourceType;
  if (sourceType === 'direct') {
    if (!form.installer.directUrl.trim()) return 'installer.source の direct URL を入力してください';
  } else if (sourceType === 'booth') {
    if (!form.installer.boothUrl.trim()) return 'installer.source の booth URL を入力してください';
  } else if (sourceType === 'github') {
    if (!form.installer.githubOwner.trim() || !form.installer.githubRepo.trim() || !form.installer.githubPattern.trim()) {
      return 'installer.source github の owner/repo/pattern は全て必須です';
    }
  } else if (sourceType === 'GoogleDrive') {
    if (!form.installer.googleDriveId.trim()) return 'GoogleDrive のファイル ID を入力してください';
  } else {
    return 'installer.source を選択してください';
  }
  for (const step of form.installer.installSteps) {
    const isStandardAction = INSTALL_ACTIONS.includes(step.action);
    const isSpecialAction = SPECIAL_INSTALL_ACTIONS.includes(step.action);
    if (!isStandardAction && !isSpecialAction) {
      const allowed = [...INSTALL_ACTIONS].join(', ');
      return `install の action は ${allowed} のみ使用できます`;
    }
    if (step.action === 'run') {
      if (!step.path.trim()) return 'run の path は必須です';
      if (step.elevate && typeof step.elevate !== 'boolean') return 'run の elevate は true/false で指定してください';
    } else if (step.elevate) {
      return 'elevate は action: run のときのみ指定できます';
    }
    if (step.action === 'copy') {
      if (!step.from.trim() || !step.to.trim()) return 'copy の from / to は必須です';
    }
  }
  for (const step of form.installer.uninstallSteps) {
    if (!UNINSTALL_ACTIONS.includes(step.action)) {
      return `uninstall の action は ${UNINSTALL_ACTIONS.join(', ')} のみ使用できます`;
    }
    if (step.action === 'run') {
      if (!step.path.trim()) return 'uninstall run の path は必須です';
      if (step.elevate && typeof step.elevate !== 'boolean') return 'uninstall run の elevate は true/false で指定してください';
    } else if (step.elevate) {
      return 'uninstall の elevate は action: run のときのみ指定できます';
    }
  }
  if (!form.versions.length) return 'バージョン情報を最低1件追加してください';
  for (const ver of form.versions) {
    if (!ver.version.trim()) return 'version の version を入力してください';
    if (!ver.release_date.trim()) return 'version の release_date を入力してください';
    if (!ver.files.length) return 'version の file を1件以上追加してください';
    for (const file of ver.files) {
      if (!file.path.trim()) return 'version.file の path を入力してください';
      if (!file.hash.trim()) return 'version.file の XXH3_128 を計算してください';
      if (file.hash.trim().length !== 32) return 'XXH3_128 は32桁の16進数で入力してください';
    }
  }
  if (form.images.thumbnail?.file && !getFileExtension(form.images.thumbnail.file.name)) {
    return 'サムネイルのファイル拡張子を確認してください';
  }
  return '';
}
// パッケージ登録ページ：データ取得・入力・送信をまとめる
export default function Register() {
  const submitEndpoint = (import.meta.env.VITE_SUBMIT_ENDPOINT || '').trim();
  const packageGuideUrl = (import.meta.env.VITE_PACKAGE_GUIDE_URL || PACKAGE_GUIDE_FALLBACK_URL).trim();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [previewDarkMode, setPreviewDarkMode] = useState(false);

  // カタログ一覧・フォーム状態・送信関連のステート群
  const [catalogItems, setCatalogItems] = useState([]);
  const [catalogLoading, setCatalogLoading] = useState(false);
  const [catalogLoaded, setCatalogLoaded] = useState(false);
  const [catalogBaseUrl, setCatalogBaseUrl] = useState('');
  const [packageSearch, setPackageSearch] = useState('');
  const deferredPackageSearch = useDeferredValue(packageSearch);
  const [selectedPackageId, setSelectedPackageId] = useState('');
  const [packageForm, setPackageForm] = useState(createEmptyPackageForm());
  const [initialTags, setInitialTags] = useState([]);
  const [currentTags, setCurrentTags] = useState([]);
  const tagListRef = useRef([]); // TagEditor 内部とは分離したタグ配列の最新値を保持
  const [packageSender, setPackageSender] = useState('');
  const [descriptionTab, setDescriptionTab] = useState('edit');
  const [descriptionLoading, setDescriptionLoading] = useState(false);
  const [expandedVersionKeys, setExpandedVersionKeys] = useState(() => new Set());
  const versionDateRefs = useRef(new Map());
  const [successDialog, setSuccessDialog] = useState({ open: false, message: '', url: '', packageName: '', packageAction: '', packageId: '' });
  const installListRef = useRef(null);
  const uninstallListRef = useRef(null);
  const dragHandleRef = useRef({ active: false, type: '', index: -1 });
  const { allTags } = useCatalog();
  const [descriptionPreviewHtml, setDescriptionPreviewHtml] = useState('');
  const deferredDescriptionText = useDeferredValue(descriptionTab === 'preview' ? packageForm.descriptionText : '');
  const renderImages = packageForm.images;
  const renderInstaller = packageForm.installer;
  const renderVersions = packageForm.versions;
  const tagCandidates = useMemo(() => {
    const set = new Set(allTags || []);
    return Array.from(set).sort((a, b) => String(a).localeCompare(String(b), 'ja'));
  }, [allTags]);
  // TagEditor からの変更を受け取り、送信時に使う参照を最新化
  const handleTagsChange = useCallback((list) => {
    const normalized = normalizeArrayText(list);
    tagListRef.current = normalized;
    setCurrentTags(normalized);
  }, []);

  useEffect(() => {
    document.body.classList.add('route-register');
    return () => { document.body.classList.remove('route-register'); };
  }, []);

  // 設定からテーマを読み込んでプレビューの初期値を設定
  useEffect(() => {
    getSettings().then(settings => {
      const theme = settings?.theme || 'darkmode';
      setPreviewDarkMode(theme !== 'lightmode');
    }).catch(() => { });
  }, []);

  // TagEditor に渡す初期タグが変わったら、送信用の参照値も合わせる
  useEffect(() => {
    tagListRef.current = normalizeArrayText(initialTags);
  }, [initialTags]);

  // Markdown プレビューはプレビュータブ表示時のみ、アイドル時間や遅延で変換して入力体験を維持
  useEffect(() => {
    if (descriptionTab !== 'preview') {
      setDescriptionPreviewHtml('');
      return;
    }
    const text = deferredDescriptionText;
    let cancelled = false;
    let idleId = null;
    let timeoutId = null;
    const run = () => {
      if (cancelled) return;
      setDescriptionPreviewHtml(renderMarkdown(text));
    };
    if (typeof requestIdleCallback === 'function') {
      idleId = requestIdleCallback(run, { timeout: 500 });
    } else {
      timeoutId = setTimeout(run, 200);
    }
    return () => {
      cancelled = true;
      if (idleId && typeof cancelIdleCallback === 'function') cancelIdleCallback(idleId);
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, [descriptionTab, deferredDescriptionText]);

  // モードごとに body クラスを付け替え（スタイル分岐用）
  useEffect(() => {
    setExpandedVersionKeys(prev => {
      const versionKeys = new Set(packageForm.versions.map(ver => ver.key));
      const next = new Set();
      let changed = false;
      prev.forEach(key => {
        if (versionKeys.has(key)) {
          next.add(key);
        } else {
          changed = true;
        }
      });
      if (!changed && next.size === prev.size) return prev;
      return next;
    });
  }, [packageForm.versions]);

  // index.json を取得してパッケージ一覧をローカルにロード
  const loadCatalog = useCallback(async () => {
    if (catalogLoaded || catalogLoading) return;
    setCatalogLoading(true);
    try {
      const endpoint = import.meta.env.VITE_REMOTE || './index.json';
      const res = await fetch(endpoint);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();
      const list = Array.isArray(json) ? json : (Array.isArray(json?.packages) ? json.packages : []);
      setCatalogItems(list);
      const base = resolveBaseUrl(res.url || endpoint) || '';
      setCatalogBaseUrl(base);
      setCatalogLoaded(true);
      if (list.length) {
        const first = list[0];
        setSelectedPackageId(first?.id || '');
        const form = entryToForm(first, base);
        const initialTagList = commaListToArray(form.tagsText);
        setInitialTags(initialTagList);
        tagListRef.current = initialTagList;
        setCurrentTags(initialTagList);
        setPackageForm(prev => {
          cleanupImagePreviews(prev.images);
          return form;
        });
        if (isMarkdownPath(form.descriptionPath)) {
          const url = resolveRelativeUrl(form.descriptionPath, base);
          setDescriptionLoading(true);
          try {
            const mdRes = await fetch(url);
            if (mdRes.ok) {
              const text = await mdRes.text();
              setPackageForm(prev => (prev.id === form.id ? { ...prev, descriptionText: text } : prev));
            }
          } catch (_) {
            /* ignore */
          } finally {
            setDescriptionLoading(false);
          }
        }
      } else {
        setSelectedPackageId('');
        setPackageForm(createEmptyPackageForm());
      }
    } catch (e) {
      setError(`index.json の取得に失敗しました: ${e?.message || e}`);
    } finally {
      setCatalogLoading(false);
    }
  }, [catalogLoaded, catalogLoading]);

  useEffect(() => {
    loadCatalog();
  }, [loadCatalog]);

  const filteredPackages = useMemo(() => {
    const query = deferredPackageSearch.trim().toLowerCase();
    const items = Array.isArray(catalogItems) ? catalogItems : [];
    if (!query) return items;
    return items.filter(item => {
      const name = String(item?.name || '').toLowerCase();
      const author = String(item?.author || '').toLowerCase();
      return name.includes(query) || author.includes(query);
    });
  }, [catalogItems, deferredPackageSearch]);

  // サイドバーのパッケージ選択/新規開始時の状態遷移
  const handleSelectPackage = useCallback(async (item) => {
    if (!item) {
      setSelectedPackageId('');
      setInitialTags([]);
      tagListRef.current = [];
      setPackageForm(prev => {
        cleanupImagePreviews(prev.images);
        return createEmptyPackageForm();
      });
      setDescriptionTab('edit');
      setExpandedVersionKeys(new Set());
      return;
    }
    const form = entryToForm(item, catalogBaseUrl);
    setSelectedPackageId(item.id || '');
    // 既存パッケージ選択時にタグ初期値を同期（エディタ内部のローカルステートと共有するため）
    const tags = commaListToArray(form.tagsText);
    setInitialTags(tags);
    tagListRef.current = tags;
    setCurrentTags(tags);
    setPackageForm(prev => {
      cleanupImagePreviews(prev.images);
      return form;
    });
    setDescriptionTab('edit');
    setExpandedVersionKeys(new Set());
    if (isMarkdownPath(form.descriptionPath)) {
      const url = resolveRelativeUrl(form.descriptionPath, catalogBaseUrl);
      setDescriptionLoading(true);
      try {
        const res = await fetch(url);
        if (res.ok) {
          const text = await res.text();
          setPackageForm(prev => (prev.id === form.id ? { ...prev, descriptionText: text } : prev));
        } else {
          setPackageForm(prev => (prev.id === form.id ? { ...prev, descriptionText: '' } : prev));
        }
      } catch (_) {
        setPackageForm(prev => (prev.id === form.id ? { ...prev, descriptionText: '' } : prev));
      } finally {
        setDescriptionLoading(false);
      }
    }
  }, [catalogBaseUrl]);

  const handleStartNewPackage = useCallback(() => {
    setSelectedPackageId('');
    setPackageForm(prev => {
      cleanupImagePreviews(prev.images);
      return createEmptyPackageForm();
    });
    setInitialTags([]);
    setCurrentTags([]);
    tagListRef.current = [];
    setDescriptionTab('edit');
    setExpandedVersionKeys(new Set());
  }, []);
  const handlePackageSearchChange = useCallback((value) => {
    setPackageSearch(value);
  }, []);
  const toggleVersionOpen = useCallback((key, open) => {
    setExpandedVersionKeys(prev => {
      const next = new Set(prev);
      if (open) {
        if (next.has(key)) return prev;
        next.add(key);
      } else {
        if (!next.has(key)) return prev;
        next.delete(key);
      }
      return next;
    });
  }, []);

  const updatePackageField = useCallback((field, value) => {
    setPackageForm(prev => ({ ...prev, [field]: value }));
  }, []);

  const updateLicenseField = useCallback((key, field, value) => {
    setPackageForm(prev => ({
      ...prev,
      licenses: (prev.licenses.length ? prev.licenses : [createEmptyLicense()]).map(license => {
        if (license.key !== key) return license;
        const next = { ...license, [field]: value };
        if (field === 'type') {
          const nextType = String(value || '');
          let nextBody = next.licenseBody;
          let nextCopy = next.copyrights;
          if (nextType === '不明' || nextType === 'その他') {
            next.isCustom = nextType === 'その他';
            if (nextType === '不明') {
              nextBody = '';
            }
            nextCopy = [createEmptyCopyright()];
          } else if (!String(next.licenseBody || '').trim()) {
            next.isCustom = false;
            nextCopy = nextCopy.length ? nextCopy : [createEmptyCopyright()];
          }
          next.licenseBody = nextBody;
          next.copyrights = nextCopy;
        }
        if (field === 'licenseBody' && value && String(value).trim().length > 0) {
          next.isCustom = true;
        }
        return next;
      }),
    }));
  }, []);

  const toggleLicenseTemplate = useCallback((key, useTemplate) => {
    setPackageForm(prev => ({
      ...prev,
      licenses: (prev.licenses.length ? prev.licenses : [createEmptyLicense()]).map(license => {
        if (license.key !== key) return license;
        const forcedCustom = license.type === 'その他';
        const forcedUnknown = license.type === '不明';
        if (forcedUnknown) {
          return {
            ...license,
            isCustom: false,
            licenseBody: '',
          };
        }
        if (forcedCustom) {
          return {
            ...license,
            isCustom: true,
            licenseBody: license.licenseBody || '',
          };
        }
        if (useTemplate) {
          return {
            ...license,
            isCustom: false,
            licenseBody: '',
            copyrights: license.copyrights.length ? license.copyrights : [createEmptyCopyright()],
          };
        }
        return {
          ...license,
          isCustom: true,
          licenseBody: license.licenseBody || '',
        };
      }),
    }));
  }, []);

  const updateCopyright = useCallback((licenseKey, copyrightKey, field, value) => {
    setPackageForm(prev => ({
      ...prev,
      licenses: (prev.licenses.length ? prev.licenses : [createEmptyLicense()]).map(license => (license.key === licenseKey
        ? {
          ...license,
          copyrights: (license.copyrights.length ? license.copyrights : [createEmptyCopyright()]).map(c => (c.key === copyrightKey ? { ...c, [field]: value } : c)),
        }
        : license)),
    }));
  }, []);

  const updateInstallerField = useCallback((field, value) => {
    setPackageForm(prev => ({ ...prev, installer: { ...prev.installer, [field]: value } }));
  }, []);

  const addInstallStep = useCallback(() => {
    setPackageForm(prev => ({
      ...prev,
      installer: {
        ...prev.installer,
        installSteps: [...prev.installer.installSteps, { key: generateKey(), action: 'download', path: '', argsText: '', from: '', to: '', elevate: false }],
      },
    }));
  }, []);

  const updateInstallStep = useCallback((key, field, value) => {
    setPackageForm(prev => ({
      ...prev,
      installer: {
        ...prev.installer,
        installSteps: prev.installer.installSteps.map(step => {
          if (step.key !== key) return step;
          const next = { ...step, [field]: value };
          if (field === 'action' && value !== 'run') {
            next.elevate = false;
          }
          return next;
        }),
      },
    }));
  }, []);

  const removeInstallStep = useCallback((key) => {
    setPackageForm(prev => ({
      ...prev,
      installer: {
        ...prev.installer,
        installSteps: prev.installer.installSteps.filter(step => step.key !== key),
      },
    }));
  }, []);

  const addUninstallStep = useCallback(() => {
    setPackageForm(prev => ({
      ...prev,
      installer: {
        ...prev.installer,
        uninstallSteps: [...prev.installer.uninstallSteps, { key: generateKey(), action: 'delete', path: '', argsText: '', elevate: false }],
      },
    }));
  }, []);
  const reorderSteps = useCallback((type, from, to) => {
    if (from === to || from < 0 || typeof to !== 'number' || to < 0) return;
    setPackageForm(prev => {
      const keyName = type === 'install' ? 'installSteps' : 'uninstallSteps';
      const list = prev.installer[keyName];
      if (from >= list.length) return prev;
      const nextList = [...list];
      const [item] = nextList.splice(from, 1);
      let insertIndex = Math.max(0, Math.min(to, list.length));
      if (from < to) insertIndex -= 1;
      insertIndex = Math.max(0, Math.min(insertIndex, nextList.length));
      nextList.splice(insertIndex, 0, item);
      return {
        ...prev,
        installer: {
          ...prev.installer,
          [keyName]: nextList,
        },
      };
    });
  }, []);

  const handlePointerMove = useCallback((event) => {
    const drag = dragHandleRef.current;
    if (!drag.active) return;
    event.preventDefault();
    const { floating, placeholder, container, offsetX, offsetY } = drag;
    floating.style.top = `${event.clientY - offsetY}px`;
    floating.style.left = `${event.clientX - offsetX}px`;
    const siblings = Array.from(container.querySelectorAll('.step-card')).filter(el => !el.classList.contains('step-card--placeholder'));
    let insertBefore = null;
    for (const sibling of siblings) {
      if (sibling === placeholder) continue;
      const rect = sibling.getBoundingClientRect();
      if (event.clientY < rect.top + rect.height / 2) {
        insertBefore = sibling;
        break;
      }
    }
    if (insertBefore) {
      container.insertBefore(placeholder, insertBefore);
    } else {
      container.appendChild(placeholder);
    }
  }, []);

  const handlePointerUp = useCallback(() => {
    const drag = dragHandleRef.current;
    if (!drag.active) return;
    drag.active = false;
    if (typeof window !== 'undefined') {
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerUp);
    }
    const { floating, placeholder, container, type, index, origin, handle, pointerId } = drag;
    floating?.remove();
    if (handle?.releasePointerCapture && pointerId != null) {
      try { handle.releasePointerCapture(pointerId); } catch (_) { /* ignore */ }
    }
    if (container && placeholder && origin) {
      const finalIndex = Array.from(container.children).indexOf(placeholder);
      container.insertBefore(origin, placeholder);
      origin.style.display = '';
      origin.classList.remove('step-card--drag-origin');
      placeholder.remove();
      reorderSteps(type, index, finalIndex);
    }
    dragHandleRef.current = { active: false, type: '', index: -1 };
  }, [handlePointerMove, reorderSteps]);

  const startHandleDrag = useCallback((type, index, event) => {
    event.preventDefault();
    event.stopPropagation();
    if (typeof window === 'undefined') return;
    const container = type === 'install' ? installListRef.current : uninstallListRef.current;
    if (!container) return;
    const cards = Array.from(container.querySelectorAll('.step-card'));
    const card = cards[index];
    if (!card) return;
    const rect = card.getBoundingClientRect();
    const placeholder = document.createElement('div');
    placeholder.className = 'step-card step-card--placeholder rounded-xl border-2 border-dashed border-blue-400/70 bg-blue-50/60 dark:border-blue-600 dark:bg-blue-900/20';
    placeholder.style.height = `${rect.height}px`;
    container.insertBefore(placeholder, card);

    const floating = card.cloneNode(true);
    floating.classList.add('step-card--floating', 'shadow-xl', 'ring-2', 'ring-blue-500/20');
    floating.style.width = `${rect.width}px`;
    floating.style.height = `${rect.height}px`;
    floating.style.position = 'fixed';
    floating.style.top = `${rect.top}px`;
    floating.style.left = `${rect.left}px`;
    floating.style.pointerEvents = 'none';
    floating.style.zIndex = '200';
    document.body.appendChild(floating);
    const sourceControls = card.querySelectorAll('input, select, textarea');
    const floatingControls = floating.querySelectorAll('input, select, textarea');
    floatingControls.forEach((ctrl, idx) => {
      const originCtrl = sourceControls[idx];
      if (!originCtrl) return;
      if (ctrl.tagName === 'SELECT') {
        ctrl.value = originCtrl.value;
      } else if (ctrl.type === 'checkbox' || ctrl.type === 'radio') {
        ctrl.checked = originCtrl.checked;
      } else {
        ctrl.value = originCtrl.value;
      }
    });

    card.classList.add('step-card--drag-origin');
    card.style.display = 'none';

    dragHandleRef.current = {
      active: true,
      type,
      index,
      origin: card,
      floating,
      placeholder,
      container,
      offsetX: event.clientX - rect.left,
      offsetY: event.clientY - rect.top,
      handle: event.currentTarget,
      pointerId: event.pointerId,
    };

    if (event.currentTarget.setPointerCapture) {
      event.currentTarget.setPointerCapture(event.pointerId);
    }

    window.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('pointerup', handlePointerUp);
  }, [handlePointerMove, handlePointerUp]);

  const updateUninstallStep = useCallback((key, field, value) => {
    setPackageForm(prev => ({
      ...prev,
      installer: {
        ...prev.installer,
        uninstallSteps: prev.installer.uninstallSteps.map(step => {
          if (step.key !== key) return step;
          const next = { ...step, [field]: value };
          if (field === 'action' && value !== 'run') {
            next.elevate = false;
          }
          return next;
        }),
      },
    }));
  }, []);

  const removeUninstallStep = useCallback((key) => {
    setPackageForm(prev => ({
      ...prev,
      installer: {
        ...prev.installer,
        uninstallSteps: prev.installer.uninstallSteps.filter(step => step.key !== key),
      },
    }));
  }, []);

  const addVersion = useCallback(() => {
    const version = createEmptyVersion();
    setPackageForm(prev => {
      const lastVer = prev.versions[prev.versions.length - 1];
      if (lastVer && Array.isArray(lastVer.files)) {
        version.files = lastVer.files.map(f => ({
          ...createEmptyVersionFile(),
          path: f.path || '',
        }));
      }
      return { ...prev, versions: [...prev.versions, version] };
    });
    setExpandedVersionKeys(prev => {
      const next = new Set(prev);
      next.add(version.key);
      return next;
    });
  }, []);

  const updateVersionField = useCallback((key, field, value) => {
    setPackageForm(prev => ({
      ...prev,
      versions: prev.versions.map(ver => (ver.key === key ? { ...ver, [field]: value } : ver)),
    }));
  }, []);

  const removeVersion = useCallback((key) => {
    setPackageForm(prev => ({ ...prev, versions: prev.versions.filter(ver => ver.key !== key) }));
  }, []);

  const addVersionFile = useCallback((versionKey) => {
    setPackageForm(prev => ({
      ...prev,
      versions: prev.versions.map(ver => (ver.key === versionKey ? { ...ver, files: [...ver.files, createEmptyVersionFile()] } : ver)),
    }));
  }, []);

  const updateVersionFile = useCallback((versionKey, fileKey, field, value) => {
    setPackageForm(prev => ({
      ...prev,
      versions: prev.versions.map(ver => (ver.key === versionKey
        ? {
          ...ver,
          files: ver.files.map(file => (file.key === fileKey ? { ...file, [field]: value } : file)),
        }
        : ver)),
    }));
  }, []);

  const removeVersionFile = useCallback((versionKey, fileKey) => {
    setPackageForm(prev => ({
      ...prev,
      versions: prev.versions.map(ver => (ver.key === versionKey
        ? { ...ver, files: ver.files.filter(file => file.key !== fileKey) }
        : ver)),
    }));
  }, []);

  const chooseFileForHash = useCallback(async (versionKey, fileKey) => {
    try {
      setError('');
      const { open } = await import('@tauri-apps/plugin-dialog');
      const selection = await open({
        multiple: false,
        title: 'XXH3_128 を計算するファイルを選択',
      });
      const selectedPath = Array.isArray(selection) ? selection[0] : selection;
      if (!selectedPath || typeof selectedPath !== 'string') return;
      const hash = await computeHashFromFile(selectedPath);
      updateVersionFile(versionKey, fileKey, 'hash', hash);
      updateVersionFile(versionKey, fileKey, 'fileName', basename(selectedPath));
    } catch (err) {
      console.error(err);
      const rawMessage = err?.message || 'XXH3_128 の計算に失敗しました';
      const friendly = typeof rawMessage === 'string' && /module/i.test(rawMessage)
        ? 'ファイル選択機能を利用できません。Tauri 環境で実行してください。'
        : rawMessage;
      setError(friendly);
    }
  }, [updateVersionFile, setError]);

  const handleThumbnailChange = useCallback((file) => {
    setPackageForm(prev => {
      const nextImages = { ...prev.images };
      if (nextImages.thumbnail?.previewUrl) revokePreviewUrl(nextImages.thumbnail.previewUrl);
      nextImages.thumbnail = file
        ? { file, existingPath: '', previewUrl: URL.createObjectURL(file), key: generateKey() }
        : null;
      return { ...prev, images: nextImages };
    });
  }, []);

  const handleRemoveThumbnail = useCallback(() => {
    setPackageForm(prev => {
      const nextImages = { ...prev.images };
      if (nextImages.thumbnail?.previewUrl) revokePreviewUrl(nextImages.thumbnail.previewUrl);
      nextImages.thumbnail = null;
      return { ...prev, images: nextImages };
    });
  }, []);

  const handleAddInfoImages = useCallback((files) => {
    if (!files || !files.length) return;
    setPackageForm(prev => ({
      ...prev,
      images: {
        ...prev.images,
        info: [
          ...prev.images.info,
          ...Array.from(files).map(file => ({
            file,
            existingPath: '',
            previewUrl: URL.createObjectURL(file),
            key: generateKey(),
          })),
        ],
      },
    }));
  }, []);

  const handleRemoveInfoImage = useCallback((key) => {
    setPackageForm(prev => {
      const nextImages = { ...prev.images };
      const target = nextImages.info.find(entry => entry.key === key);
      if (target?.previewUrl) revokePreviewUrl(target.previewUrl);
      nextImages.info = nextImages.info.filter(entry => entry.key !== key);
      return { ...prev, images: nextImages };
    });
  }, []);

  const closeSuccessDialog = useCallback(() => {
    setSuccessDialog({ open: false, message: '', url: '', packageName: '', packageAction: '', packageId: '' });
  }, []);
  const openDatePicker = useCallback((key) => {
    const input = versionDateRefs.current.get(key);
    if (!input) return;
    const previousScrollY = typeof window !== 'undefined' ? window.scrollY : 0;
    try { input.focus({ preventScroll: true }); } catch (_) { input.focus(); }
    if (input.showPicker) {
      try { input.showPicker(); } catch (_) { input.click(); }
    } else {
      input.click();
    }
    if (typeof window !== 'undefined') {
      window.scrollTo(0, previousScrollY);
    }
  }, []);

  const packageMdFilename = useMemo(() => {
    const id = packageForm.id.trim() || 'package';
    return `${id}.md`;
  }, [packageForm.id]);

  // パッケージ情報を payload にまとめて送信
  const handleSubmit = useCallback(async (e) => {
    e.preventDefault();
    setError('');
    if (!submitEndpoint) {
      setError('VITE_SUBMIT_ENDPOINT が設定されていません。');
      return;
    }
    if (!/^https:\/\//i.test(submitEndpoint)) {
      setError('VITE_SUBMIT_ENDPOINT には https:// で始まるURLを設定してください。');
      return;
    }
    try {
      const validation = validatePackageForm(packageForm);
      if (validation) {
        setError(validation);
        return;
      }
      const entry = buildPackageEntry(packageForm, tagListRef.current);
      const existingIndex = catalogItems.findIndex(item => item.id === entry.id);
      const nextCatalog = existingIndex >= 0
        ? catalogItems.map((item, idx) => (idx === existingIndex ? entry : item))
        : [...catalogItems, entry];
      const formData = new FormData();
      let packageAttachmentCount = 0;
      const appendAsset = (file, filename, countTowardsLimit = true) => {
        formData.append('files[]', file, filename);
        if (countTowardsLimit) packageAttachmentCount += 1;
      };
      const mdBlob = new Blob([packageForm.descriptionText || ''], { type: 'text/markdown' });
      appendAsset(mdBlob, packageMdFilename);
      if (packageForm.images.thumbnail?.file) {
        const ext = getFileExtension(packageForm.images.thumbnail.file.name) || 'png';
        appendAsset(packageForm.images.thumbnail.file, `${entry.id}_thumbnail.${ext}`);
      }
      packageForm.images.info.forEach((entryInfo, idx) => {
        if (entryInfo.file) {
          const ext = getFileExtension(entryInfo.file.name) || 'png';
          appendAsset(entryInfo.file, `${entry.id}_${idx + 1}.${ext}`);
        }
      });
      if (packageAttachmentCount === 0) {
        setError('Markdown と画像ファイルを添付してください');
        return;
      }
      const indexJsonBlob = new Blob([JSON.stringify(nextCatalog, null, 2)], { type: 'application/json' });
      appendAsset(indexJsonBlob, 'index.json', false);
      const actionLabel = existingIndex >= 0 ? 'パッケージ更新' : 'パッケージ追加';
      const packageDialogInfo = {
        actionLabel,
        packageName: entry.name || entry.id,
        packageId: entry.id,
      };
      const senderName = packageSender.trim();
      const payload = {
        action: SUBMIT_ACTIONS.package,
        title: `${actionLabel}: ${entry.name}`,
        packageId: entry.id,
        packageName: entry.name,
        packageAuthor: entry.author,
        labels: ['package', 'from-client'],
      };
      if (senderName) {
        payload.sender = senderName;
      }
      setCatalogItems(nextCatalog);
      setSelectedPackageId(entry.id);

      formData.append('payload', JSON.stringify(payload));
      setSubmitting(true);
      const res = await fetch(submitEndpoint, { method: 'POST', body: formData });
      const contentType = res.headers.get('content-type') || '';
      let responseJson = null;
      let responseText = '';
      if (contentType.includes('application/json')) {
        responseJson = await res.json().catch(() => null);
      } else if (res.status !== 204) {
        responseText = await res.text().catch(() => '');
      }
      if (!res.ok) {
        const message = responseJson?.error || responseJson?.message || responseJson?.detail || responseText || `HTTP ${res.status}`;
        throw new Error(message);
      }
      const successUrl = responseJson?.pr_url || responseJson?.public_issue_url || responseJson?.url;
      const defaultMessage = '送信が完了しました。';
      const friendlyMessage = responseJson?.message || responseText || defaultMessage;
      setSuccessDialog({
        open: true,
        message: friendlyMessage,
        url: successUrl || '',
        packageAction: packageDialogInfo.actionLabel || '',
        packageName: packageDialogInfo.packageName || '',
        packageId: packageDialogInfo.packageId || '',
      });
    } catch (err) {
      console.error(err);
      setError(err?.message || '送信に失敗しました。ネットワークや設定をご確認ください。');
    } finally {
      setSubmitting(false);
    }
  }, [packageForm, catalogItems, packageMdFilename, submitEndpoint, packageSender]);

  const successPrimaryText = successDialog.packageName
    ? `${successDialog.packageAction || '送信完了'}: ${successDialog.packageName}`
    : (successDialog.message || '送信が完了しました。');
  const successSupportText = successDialog.packageName && successDialog.message ? successDialog.message : '';
  // 画面描画
  const computedTitle = 'パッケージ登録';
  const computedDescription = 'パッケージ情報を入力して送信してください。';

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      {successDialog.open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 backdrop-blur-sm" role="dialog" aria-modal="true" aria-labelledby="submit-success-title">
          <div className="absolute inset-0 bg-black/50 transition-opacity" onClick={closeSuccessDialog} />
          <div className="relative w-full max-w-lg transform overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl transition-all dark:border-slate-800 dark:bg-slate-900">
            <div className="border-b border-slate-100 bg-slate-50/50 px-6 py-4 dark:border-slate-800 dark:bg-slate-900/50">
              <h3 id="submit-success-title" className="text-lg font-bold text-slate-800 dark:text-slate-100">送信が完了しました</h3>
            </div>
            <div className="px-6 py-6">
              <div className="flex items-start gap-4">
                <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400" aria-hidden>
                  <Icon name="check" size={24} />
                </div>
                <div className="space-y-1">
                  <p className="font-semibold text-slate-800 dark:text-slate-100">{successPrimaryText}</p>
                  {successSupportText && <p className="text-sm text-slate-500 dark:text-slate-400">{successSupportText}</p>}
                </div>
              </div>
            </div>
            <div className="flex flex-wrap items-center justify-end gap-3 border-t border-slate-100 bg-slate-50/50 px-6 py-4 dark:border-slate-800 dark:bg-slate-900/50">
              {successDialog.url && (
                <a
                  className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
                  href={successDialog.url}
                  target="_blank"
                  rel="noreferrer noopener"
                >
                  <Icon name="external_link" size={16} />
                  公開ページを開く
                </a>
              )}
              <button type="button" className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 dark:hover:bg-blue-500" onClick={closeSuccessDialog}>閉じる</button>
            </div>
          </div>
        </div>
      )}

      <main className="space-y-8">
        <header className="space-y-2 border-b border-slate-200 pb-6 dark:border-slate-800">
          <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white">{computedTitle}</h1>
          <p className="text-lg text-slate-600 dark:text-slate-400">{computedDescription}</p>
        </header>

        {error && (
          <div className="flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-red-800 dark:border-red-900/50 dark:bg-red-900/20 dark:text-red-300" role="alert">
            <Icon name="alert_circle" size={20} className="mt-0.5 flex-shrink-0" />
            <div className="text-sm font-medium">{error}</div>
          </div>
        )}

        <form className="space-y-8" onSubmit={handleSubmit}>
          <div className="grid gap-8 lg:grid-cols-[280px_1fr]">
            {/* Sidebar */}
            <aside className="space-y-6">
              <div className="sticky top-6 space-y-4">
                <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
                  <div className="space-y-3">
                    <div className="relative">
                      <Icon name="search" size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                      <input
                        type="search"
                        value={packageSearch}
                        onChange={e => handlePackageSearchChange(e.target.value)}
                        placeholder="パッケージを検索..."
                        className="w-full pl-9"
                      />
                    </div>
                    <div className="space-y-2">
                      <div className="text-xs font-bold uppercase tracking-wider text-slate-400">
                        パッケージ一覧
                      </div>
                      <div className="max-h-[calc(100vh-300px)] min-h-[300px] overflow-y-auto space-y-1 pr-1 custom-scrollbar">
                        {catalogLoading && !catalogLoaded ? (
                          <div className="flex items-center justify-center py-8 text-sm text-slate-500">
                            <span className="spinner mr-2" />
                            読み込み中...
                          </div>
                        ) : (
                          filteredPackages.map(item => {
                            const isSelected = selectedPackageId === item.id;
                            return (
                              <button
                                key={item.id}
                                type="button"
                                onClick={() => handleSelectPackage(item)}
                                className={`group flex w-full flex-col gap-0.5 rounded-lg border px-3 py-2.5 text-left text-sm transition-all ${isSelected
                                  ? 'border-blue-500 bg-blue-50 shadow-sm dark:bg-blue-900/20 dark:border-blue-500/50'
                                  : 'border-transparent hover:bg-slate-50 dark:hover:bg-slate-800'
                                  }`}
                              >
                                <span className={`font-semibold ${isSelected ? 'text-blue-700 dark:text-blue-300' : 'text-slate-700 dark:text-slate-200'}`}>
                                  {item.name || item.id}
                                </span>
                                <span className={`text-xs ${isSelected ? 'text-blue-600/80 dark:text-blue-400/80' : 'text-slate-500 dark:text-slate-400'}`}>
                                  {item.author || '作者不明'}
                                </span>
                              </button>
                            );
                          })
                        )}
                        {!catalogLoading && filteredPackages.length === 0 && (
                          <div className="rounded-lg border border-dashed border-slate-200 bg-slate-50 px-4 py-8 text-center text-sm text-slate-500 dark:border-slate-800 dark:bg-slate-900/50 dark:text-slate-400">
                            該当なし
                          </div>
                        )}
                      </div>
                    </div>
                    <button
                      type="button"
                      className="flex w-full items-center justify-center gap-2 rounded-lg border-2 border-dashed border-slate-300 bg-transparent px-4 py-3 text-sm font-bold text-slate-600 transition hover:border-blue-500 hover:bg-blue-50 hover:text-blue-600 dark:border-slate-700 dark:text-slate-400 dark:hover:bg-blue-900/20 dark:hover:text-blue-400"
                      onClick={handleStartNewPackage}
                    >
                      <Icon name="plus" size={18} />
                      新規パッケージ作成
                    </button>
                  </div>
                </div>
              </div>
            </aside>

            {/* Main Form Area */}
            <div className="space-y-8">
              <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
                <div className="mb-6 flex items-start gap-3 rounded-xl border border-blue-100 bg-blue-50/50 px-4 py-3 text-sm text-blue-800 dark:border-blue-900/30 dark:bg-blue-900/10 dark:text-blue-300">
                  <Icon name="info" size={20} className="mt-0.5 flex-shrink-0 text-blue-500" />
                  <div>
                    このフォームに入力するプラグイン情報はすべて公開されます。<br />
                    パッケージ登録は作者本人でなくてもどなたでも行えます。
                  </div>
                </div>

                <div className="grid gap-6">
                  {/* Basic Identifiers */}
                  <div className="grid gap-6 md:grid-cols-2">
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-slate-700 dark:text-slate-300">
                        ID <span className="text-red-500">*</span>
                      </label>
                      <input
                        name="id"
                        value={packageForm.id}
                        onChange={e => updatePackageField('id', e.target.value)}
                        required
                        placeholder="Kenkun.AviUtlExEdit2"
                      />
                      <p className="text-xs text-slate-500 dark:text-slate-400">英数字と記号 ( . - _ ) のみ</p>
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-slate-700 dark:text-slate-300">
                        パッケージ名 <span className="text-red-500">*</span>
                      </label>
                      <input
                        name="name"
                        value={packageForm.name}
                        onChange={e => updatePackageField('name', e.target.value)}
                        required
                        placeholder="AviUtl2"
                      />
                    </div>
                  </div>

                  {/* Authors & Type */}
                  <div className="grid gap-6 md:grid-cols-2">
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-slate-700 dark:text-slate-300">
                        作者名 <span className="text-red-500">*</span>
                      </label>
                      <input
                        name="author"
                        value={packageForm.author}
                        onChange={e => updatePackageField('author', e.target.value)}
                        required
                        placeholder="KENくん"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-slate-700 dark:text-slate-300">オリジナル作者名 (任意)</label>
                      <input
                        name="originalAuthor"
                        value={packageForm.originalAuthor}
                        onChange={e => updatePackageField('originalAuthor', e.target.value)}
                        placeholder="オリジナル版がある場合に入力"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-slate-700 dark:text-slate-300">
                        種類 <span className="text-red-500">*</span>
                      </label>
                      <input
                        name="type"
                        value={packageForm.type}
                        onChange={e => updatePackageField('type', e.target.value)}
                        required
                        placeholder="入力/出力/汎用プラグイン, スクリプト, 言語ファイル"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-slate-700 dark:text-slate-300">パッケージのサイト</label>
                      <input
                        name="repoURL"
                        value={packageForm.repoURL}
                        onChange={e => updatePackageField('repoURL', e.target.value)}
                        placeholder="パッケージのことが分かるURL"
                        type="url"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium text-slate-700 dark:text-slate-300">依存パッケージ (現在非対応)</label>
                    <input
                      name="dependencies"
                      value={packageForm.dependenciesText}
                      onChange={e => updatePackageField('dependenciesText', e.target.value)}
                      placeholder="パッケージID (カンマ区切り)"
                    />
                  </div>

                  <TagEditor initialTags={initialTags} suggestions={tagCandidates} onChange={handleTagsChange} />

                  <div className="space-y-2">
                    <label className="text-sm font-medium text-slate-700 dark:text-slate-300">
                      概要 <span className="text-red-500">*</span>
                    </label>
                    <input
                      name="summary"
                      value={packageForm.summary}
                      maxLength={35}
                      onChange={e => updatePackageField('summary', e.target.value)}
                      required
                      placeholder="パッケージの概要 (35文字以内)"
                    />
                    <div className="flex justify-end">
                      <span className={`text-xs ${packageForm.summary.length > 35 ? 'text-red-500 font-bold' : 'text-slate-400'}`}>
                        {packageForm.summary.length} / 35
                      </span>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <label htmlFor="description-textarea" className="text-sm font-medium text-slate-700 dark:text-slate-300">
                        詳細説明 <span className="text-red-500">*</span>
                      </label>
                      <span className="text-xs text-slate-500 dark:text-slate-400">Markdown形式</span>
                    </div>
                    <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
                      <div className="flex border-b border-slate-100 bg-slate-50/50 px-2 pt-2 dark:border-slate-800 dark:bg-slate-900/50" role="tablist">
                        <button
                          type="button"
                          role="tab"
                          aria-selected={descriptionTab === 'edit'}
                          className={`rounded-t-lg px-4 py-2 text-sm font-semibold transition-colors ${descriptionTab === 'edit'
                            ? 'bg-white text-blue-600 shadow-[0_-1px_2px_rgba(0,0,0,0.05)] dark:bg-slate-900 dark:text-blue-400'
                            : 'text-slate-500 hover:bg-slate-100 hover:text-slate-700 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-200'
                            }`}
                          onClick={() => setDescriptionTab('edit')}
                        >
                          編集
                        </button>
                        <button
                          type="button"
                          role="tab"
                          aria-selected={descriptionTab === 'preview'}
                          className={`rounded-t-lg px-4 py-2 text-sm font-semibold transition-colors ${descriptionTab === 'preview'
                            ? 'bg-white text-blue-600 shadow-[0_-1px_2px_rgba(0,0,0,0.05)] dark:bg-slate-900 dark:text-blue-400'
                            : 'text-slate-500 hover:bg-slate-100 hover:text-slate-700 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-200'
                            }`}
                          onClick={() => setDescriptionTab('preview')}
                        >
                          プレビュー
                        </button>
                      </div>
                      <div className="p-0">
                        {descriptionTab === 'edit' ? (
                          <textarea
                            id="description-textarea"
                            className="min-h-[400px] w-full resize-y border-0 bg-transparent p-4 font-mono text-sm leading-relaxed focus:ring-0"
                            value={packageForm.descriptionText}
                            onChange={e => updatePackageField('descriptionText', e.target.value)}
                            required
                            placeholder="パッケージの詳細情報を入力してください。Markdown形式で記入できます。どこから呼び出せるか（メニュー位置など）や、UIの説明もあわせて記入していただけると助かります。外部サイトの画像も貼り付けることができます。"
                          />
                        ) : (
                          <div
                            className="prose prose-slate max-h-[400px] w-full max-w-none overflow-y-auto p-6 dark:prose-invert"
                            dangerouslySetInnerHTML={{ __html: descriptionPreviewHtml }}
                            onClick={async (e) => {
                              const link = e.target.closest('a');
                              if (link && link.href) {
                                e.preventDefault();
                                await open(link.href);
                              }
                            }}
                          />
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </section>

              <PackageLicenseSection
                license={packageForm.licenses[0]}
                onUpdateLicenseField={updateLicenseField}
                onToggleTemplate={toggleLicenseTemplate}
                onUpdateCopyright={updateCopyright}
              />

              <PackageImagesSection
                images={renderImages}
                packageId={packageForm.id}
                onThumbnailChange={handleThumbnailChange}
                onRemoveThumbnail={handleRemoveThumbnail}
                onAddInfoImages={handleAddInfoImages}
                onRemoveInfoImage={handleRemoveInfoImage}
              />

              <PackageInstallerSection
                installer={renderInstaller}
                installListRef={installListRef}
                uninstallListRef={uninstallListRef}
                addInstallStep={addInstallStep}
                addUninstallStep={addUninstallStep}
                removeInstallStep={removeInstallStep}
                removeUninstallStep={removeUninstallStep}
                startHandleDrag={startHandleDrag}
                updateInstallStep={updateInstallStep}
                updateInstallerField={updateInstallerField}
                updateUninstallStep={updateUninstallStep}
              />

              <PackageVersionSection
                versions={renderVersions}
                expandedVersionKeys={expandedVersionKeys}
                toggleVersionOpen={toggleVersionOpen}
                removeVersion={removeVersion}
                updateVersionField={updateVersionField}
                addVersion={addVersion}
                addVersionFile={addVersionFile}
                removeVersionFile={removeVersionFile}
                updateVersionFile={updateVersionFile}
                chooseFileForHash={chooseFileForHash}
                openDatePicker={openDatePicker}
                versionDateRefs={versionDateRefs}
              />

              <section className="space-y-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
                <div className="flex items-center justify-between gap-2">
                  <h2 className="text-lg font-bold text-slate-800 dark:text-slate-100">プレビュー</h2>
                  <button
                    type="button"
                    onClick={() => setPreviewDarkMode(!previewDarkMode)}
                    className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-medium text-slate-600 transition hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
                  >
                    <Icon name={previewDarkMode ? "sun" : "moon"} size={14} />
                    <span>{previewDarkMode ? 'ライトモードに切り替え' : 'ダークモードに切り替え'}</span>
                  </button>
                </div>
                <div className={`overflow-x-auto rounded-xl border border-slate-200 p-8 transition-colors ${previewDarkMode ? 'bg-slate-950 border-slate-800 dark' : 'bg-slate-50 light'}`}>
                  <div className="flex justify-center pointer-events-none opacity-90 grayscale-[10%]">
                    <div className="w-[500px]">
                      <PackageCard
                        item={{
                          id: packageForm.id || 'preview-id',
                          name: packageForm.name || 'パッケージ名',
                          author: packageForm.author || '作者名',
                          type: packageForm.type || '種類',
                          tags: currentTags,
                          summary: packageForm.summary || '概要がここに表示されます',
                          images: [{
                            thumbnail: packageForm.images.thumbnail?.previewUrl || '',
                            infoImg: packageForm.images.info.map(i => i.previewUrl).filter(Boolean)
                          }],
                          updatedAt: packageForm.versions.length > 0 ? packageForm.versions[packageForm.versions.length - 1].release_date : new Date().toISOString(),
                          installed: false,
                          isLatest: true,
                        }}
                      />
                    </div>
                  </div>
                </div>
              </section>

              <section className="sticky bottom-4 z-20 rounded-2xl border border-slate-200 bg-white/90 p-4 shadow-xl backdrop-blur-md dark:border-slate-800 dark:bg-slate-900/90">
                <div className="flex flex-wrap items-center justify-between gap-4">
                  <div className="flex items-center gap-2">
                    {packageGuideUrl && (
                      <a
                        className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
                        href={packageGuideUrl}
                        target="_blank"
                        rel="noreferrer noopener"
                      >
                        <Icon name="book_open" size={16} />
                        説明サイト
                      </a>
                    )}
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="hidden sm:block">
                      <div className="flex flex-col">
                        <input
                          type="text"
                          value={packageSender}
                          onChange={e => setPackageSender(e.target.value)}
                          placeholder="送信者のニックネーム (任意)"
                          className="min-w-[200px]"
                          aria-label="送信者のニックネーム"
                        />
                        <p className="mt-1 text-[10px] leading-tight text-slate-500 dark:text-slate-400">
                          GitHubのIDを入力してもらえると、問題があった際のやり取りがスムーズになります
                        </p>
                      </div>
                    </div>
                    <button
                      type="submit"
                      className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-6 py-2.5 text-sm font-bold text-white shadow-md transition hover:bg-blue-700 hover:shadow-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 disabled:cursor-not-allowed disabled:opacity-60 dark:hover:bg-blue-500"
                      disabled={submitting}
                    >
                      {submitting ? (
                        <>
                          <span className="spinner" />
                          送信中…
                        </>
                      ) : (
                        <>
                          <Icon name="send" size={18} />
                          送信する
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </section>
            </div>
          </div>
        </form>
      </main>
    </div>
  );
}
