
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Header from '../components/Header.jsx';
import Icon from '../components/Icon.jsx';
import { collectDeviceInfo, readAppLog, loadInstalledMap } from '../app/utils.js';
import { renderMarkdown } from '../app/markdown.js';

const INSTALL_ACTIONS = ['download', 'extract', 'run', 'copy'];
const SPECIAL_INSTALL_ACTIONS = ['extract_sfx', 'run_auo_setup'];
const UNINSTALL_ACTIONS = ['delete', 'run'];
const ID_PATTERN = /^[A-Za-z0-9.]+$/;
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
  { value: 'direct', label: '直接URLからダウンロード' },
  { value: 'github', label: 'GitHub Release' },
  { value: 'GoogleDrive', label: 'Google Drive' },
];
const SUBMIT_ACTIONS = {
  bug: 'issues',
  inquiry: 'feedback',
  package: 'plugin',
};
const PACKAGE_GUIDE_FALLBACK_URL = 'https://github.com/Neosku/aviutl2-catalog-data/blob/main/register-package.md';

function generateKey() {
  return Math.random().toString(36).slice(2, 10);
}

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

function createEmptyInstaller() {
  return {
    sourceType: 'direct',
    directUrl: '',
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
  return {
    key: generateKey(),
    version: '',
    release_date: '',
    files: [createEmptyVersionFile()],
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
    license: '',
    tagsText: '',
    dependenciesText: '',
    installer: createEmptyInstaller(),
    versions: [],
    images: {
      thumbnail: null,
      info: [],
    },
  };
}

function DeleteButton({ onClick, ariaLabel = '削除', title }) {
  return (
    <button
      type="button"
      className="btn btn--icon"
      aria-label={ariaLabel}
      title={title || ariaLabel}
      onClick={onClick}
    >
      <Icon name="delete" size={16} />
    </button>
  );
}

function VisibilityBadge({ type = 'public', label }) {
  const text = label || (type === 'public' ? '公開' : '非公開');
  return (
    <span className={`visibility-badge visibility-badge--${type}`}>
      {text}
    </span>
  );
}

function parseInstallerSource(installer = {}) {
  if (!installer || typeof installer !== 'object') return createEmptyInstaller();
  const next = createEmptyInstaller();
  const source = installer.source || {};
  if (source.direct) {
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
    };
  });
  const uninstallSteps = Array.isArray(installer.uninstall) ? installer.uninstall : [];
  next.uninstallSteps = uninstallSteps.map(step => ({
    key: generateKey(),
    action: UNINSTALL_ACTIONS.includes(step?.action) ? step.action : 'delete',
    path: String(step?.path || ''),
    argsText: Array.isArray(step?.args) ? step.args.map(arg => String(arg || '')).filter(Boolean).join(', ') : '',
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
  form.license = String(item.license || '');
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
  if (step.action === 'run') {
    if (step.path) payload.path = step.path;
    if (step.argsText) {
      payload.args = step.argsText.split(',').map(v => v.trim()).filter(Boolean);
    }
  }
  if (step.action === 'copy') {
    if (step.from) payload.from = step.from;
    if (step.to) payload.to = step.to;
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
  } else if (step.action === 'delete' && step.path) {
    payload.path = step.path;
  }
  return payload;
}
function buildInstallerPayload(form) {
  const source = extractInstallerSource(form);
  return {
    source,
    install: form.installer.installSteps.map(serializeInstallStep),
    uninstall: form.installer.uninstallSteps.map(serializeUninstallStep),
  };
}

function buildImagesPayload(form) {
  const id = form.id.trim();
  const group = { thumbnail: '', infoImg: [] };
  if (form.images.thumbnail) {
    if (form.images.thumbnail.file) {
      const ext = getFileExtension(form.images.thumbnail.file.name) || 'png';
      group.thumbnail = `./image/${id}_thumbnail.${ext}`;
    } else if (form.images.thumbnail.existingPath) {
      group.thumbnail = form.images.thumbnail.existingPath;
    }
  }
  form.images.info.forEach((entry, idx) => {
    if (entry.file) {
      const ext = getFileExtension(entry.file.name) || 'png';
      group.infoImg.push(`./image/${id}_${idx + 1}.${ext}`);
    } else if (entry.existingPath) {
      group.infoImg.push(entry.existingPath);
    }
  });
  if (!group.thumbnail && !group.infoImg.length) {
    return [];
  }
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
  const { invoke } = await import('@tauri-apps/api/core');
  const hex = await invoke('calc_xxh3_hex', { path });
  if (!hex || typeof hex !== 'string') {
    throw new Error('XXH3_128 を計算できませんでした。');
  }
  return hex.toLowerCase();
}

function buildPackageEntry(form) {
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
    license: form.license.trim(),
    tags: commaListToArray(form.tagsText),
    dependencies: commaListToArray(form.dependenciesText),
    images: buildImagesPayload(form),
    installer: buildInstallerPayload(form),
    version: buildVersionPayload(form),
  };
  if (!entry.originalAuthor) delete entry.originalAuthor;
  if (!entry.repoURL) entry.repoURL = '';
  if (!entry.license) entry.license = '';
  if (!entry.tags.length) entry.tags = [];
  if (!entry.dependencies.length) entry.dependencies = [];
  if (!entry.images.length) delete entry.images;
  return entry;
}

function validatePackageForm(form) {
  if (!form.id.trim()) return 'ID は必須です';
  if (!ID_PATTERN.test(form.id.trim())) return 'ID は英数字とドットのみ使用できます';
  if (!form.name.trim()) return 'パッケージ名は必須です';
  if (!form.author.trim()) return '作者名は必須です';
  if (!form.type.trim()) return '種類は必須です';
  if (!form.summary.trim()) return '概要は必須です';
  if (form.summary.trim().length > 55) return '概要は55文字以内で入力してください';
  if (!form.descriptionText.trim()) return '詳細を入力してください';
  if (!form.license.trim()) return 'ライセンスは必須です';
  const sourceType = form.installer.sourceType;
  if (sourceType === 'direct') {
    if (!form.installer.directUrl.trim()) return 'installer.source の direct URL を入力してください';
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
export default function Submit() {
  const submitEndpoint = (import.meta.env.VITE_SUBMIT_ENDPOINT || '').trim();
  const packageGuideUrl = (import.meta.env.VITE_PACKAGE_GUIDE_URL || PACKAGE_GUIDE_FALLBACK_URL).trim();
  const [mode, setMode] = useState('package');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const [bug, setBug] = useState({ title: '', detail: '', contact: '', includeDevice: true, includeLog: true });
  const [device, setDevice] = useState(null);
  const [pluginsPreview, setPluginsPreview] = useState('');
  const [appLog, setAppLog] = useState('');
  const [loadingDiag, setLoadingDiag] = useState(false);
  const [attachments, setAttachments] = useState([]);
  const [appVersion, setAppVersion] = useState('');
  const [inq, setInq] = useState({ title: '', detail: '', contact: '', includeApp: true, includeDevice: true, includeLog: true });

  const [catalogItems, setCatalogItems] = useState([]);
  const [catalogLoading, setCatalogLoading] = useState(false);
  const [catalogLoaded, setCatalogLoaded] = useState(false);
  const [catalogBaseUrl, setCatalogBaseUrl] = useState('');
  const [packageSearch, setPackageSearch] = useState('');
  const [selectedPackageId, setSelectedPackageId] = useState('');
  const [packageForm, setPackageForm] = useState(createEmptyPackageForm());
  const [packageSender, setPackageSender] = useState('');
  const [descriptionTab, setDescriptionTab] = useState('edit');
  const [descriptionLoading, setDescriptionLoading] = useState(false);
  const [expandedVersionKeys, setExpandedVersionKeys] = useState(() => new Set());
  const versionDateRefs = useRef(new Map());
  const [successDialog, setSuccessDialog] = useState({ open: false, message: '', url: '', packageName: '', packageAction: '', packageId: '' });
  const installListRef = useRef(null);
  const uninstallListRef = useRef(null);
  const dragHandleRef = useRef({ active: false, type: '', index: -1 });

  useEffect(() => {
    document.body.classList.add('route-submit');
    return () => { document.body.classList.remove('route-submit'); };
  }, []);

  useEffect(() => {
    if (mode === 'package') {
      document.body.classList.add('route-submit--package');
    } else {
      document.body.classList.remove('route-submit--package');
    }
    return () => { document.body.classList.remove('route-submit--package'); };
  }, [mode]);

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

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoadingDiag(true);
      try {
        const info = await collectDeviceInfo();
        if (!cancelled) setDevice(info);
      } catch (_) {
        if (!cancelled) setDevice(null);
      }
      try {
        const app = await import('@tauri-apps/api/app');
        const v = (app?.getVersion) ? await app.getVersion() : '';
        if (!cancelled) setAppVersion(String(v || ''));
      } catch (_) {
        if (!cancelled) setAppVersion('');
      }
      try {
        const map = await loadInstalledMap();
        if (!cancelled) {
          const lines = Object.entries(map || {})
            .map(([id, ver]) => (ver ? `${id} ${ver}` : id))
            .slice(0, 300)
            .join('\n');
          setPluginsPreview(lines);
        }
      } catch (_) {
        if (!cancelled) setPluginsPreview('');
      } finally {
        if (!cancelled) setLoadingDiag(false);
      }
      try {
        const text = await readAppLog();
        if (!cancelled) setAppLog(text || '');
      } catch (_) {
        if (!cancelled) setAppLog('');
      }
    }
    if (mode === 'bug') load();
    return () => { cancelled = true; };
  }, [mode]);

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
    if (mode === 'package') {
      loadCatalog();
    }
  }, [mode, loadCatalog]);

  const filteredPackages = useMemo(() => {
    const query = packageSearch.trim().toLowerCase();
    const items = Array.isArray(catalogItems) ? catalogItems : [];
    if (!query) return items;
    return items.filter(item => {
      const name = String(item?.name || '').toLowerCase();
      const author = String(item?.author || '').toLowerCase();
      return name.includes(query) || author.includes(query);
    });
  }, [catalogItems, packageSearch]);

  const handleSelectPackage = useCallback(async (item) => {
    if (!item) {
      setSelectedPackageId('');
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
    setDescriptionTab('edit');
    setExpandedVersionKeys(new Set());
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

  const updateInstallerField = useCallback((field, value) => {
    setPackageForm(prev => ({ ...prev, installer: { ...prev.installer, [field]: value } }));
  }, []);

  const addInstallStep = useCallback(() => {
    setPackageForm(prev => ({
      ...prev,
      installer: {
        ...prev.installer,
        installSteps: [...prev.installer.installSteps, { key: generateKey(), action: 'download', path: '', argsText: '', from: '', to: '' }],
      },
    }));
  }, []);

  const updateInstallStep = useCallback((key, field, value) => {
    setPackageForm(prev => ({
      ...prev,
      installer: {
        ...prev.installer,
        installSteps: prev.installer.installSteps.map(step => (step.key === key ? { ...step, [field]: value } : step)),
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
        uninstallSteps: [...prev.installer.uninstallSteps, { key: generateKey(), action: 'delete', path: '', argsText: '' }],
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
    const siblings = Array.from(container.querySelectorAll('.package-card')).filter(el => !el.classList.contains('package-card--placeholder'));
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
      origin.classList.remove('package-card--drag-origin');
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
    const cards = Array.from(container.querySelectorAll('.package-card'));
    const card = cards[index];
    if (!card) return;
    const rect = card.getBoundingClientRect();
    const placeholder = document.createElement('div');
    placeholder.className = 'package-card package-card--placeholder';
    placeholder.style.height = `${rect.height}px`;
    container.insertBefore(placeholder, card);

    const floating = card.cloneNode(true);
    floating.classList.add('form', 'form--package');
    floating.classList.add('package-card--floating');
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

    card.classList.add('package-card--drag-origin');
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
        uninstallSteps: prev.installer.uninstallSteps.map(step => (step.key === key ? { ...step, [field]: value } : step)),
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
    setPackageForm(prev => ({ ...prev, versions: [...prev.versions, version] }));
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

  const handleBugChange = useCallback((e) => {
    const { name, value, type, checked } = e.target;
    setBug(prev => ({ ...prev, [name]: type === 'checkbox' ? !!checked : value }));
  }, []);

  const handleInqChange = useCallback((e) => {
    const { name, value, type, checked } = e.target;
    setInq(prev => ({ ...prev, [name]: type === 'checkbox' ? !!checked : value }));
  }, []);

  const onFilesChange = useCallback((e) => {
    const files = Array.from(e.target?.files || []);
    setAttachments(prev => {
      const list = Array.from(prev || []);
      const existing = new Set(list.map(f => `${f.name}:${f.size}:${f.lastModified}`));
      for (const f of files) {
        const key = `${f.name}:${f.size}:${f.lastModified}`;
        if (!existing.has(key)) {
          list.push(f);
          existing.add(key);
        }
      }
      return list;
    });
    try { if (e.target) e.target.value = ''; } catch (_) { /* ignore */ }
  }, []);

  const removeAttachment = useCallback((index) => {
    setAttachments(prev => (prev || []).filter((_, i) => i !== index));
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
      let payload = {};
      const formData = new FormData();
      let packageDialogInfo = null;
      if (mode === 'package') {
        const validation = validatePackageForm(packageForm);
        if (validation) {
          setError(validation);
          return;
        }
        const entry = buildPackageEntry(packageForm);
        const existingIndex = catalogItems.findIndex(item => item.id === entry.id);
        const nextCatalog = existingIndex >= 0
          ? catalogItems.map((item, idx) => (idx === existingIndex ? entry : item))
          : [...catalogItems, entry];
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
        packageDialogInfo = {
          actionLabel,
          packageName: entry.name || entry.id,
          packageId: entry.id,
        };
        const senderName = packageSender.trim();
        payload = {
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
      } else if (mode === 'bug') {
        if (!bug.title.trim() || !bug.detail.trim()) {
          setError('タイトルと詳細は必須です');
          return;
        }
        const lines = [];
        // if (appVersion) lines.push(`アプリのバージョン: ${appVersion}`); 
        lines.push(bug.detail.trim());
        let osStr = '';
        let cpuStr = '';
        let gpuStr = '';
        let installedStr = '';
        if (bug.includeDevice) {
          osStr = `${device?.os?.name || ''} ${device?.os?.version || ''} (${device?.os?.arch || ''})`.trim();
          cpuStr = `${device?.cpu?.model || ''}${device?.cpu?.cores ? ` / Cores: ${device.cpu.cores}` : ''}`.trim();
          gpuStr = `${device?.gpu?.vendor || ''} ${device?.gpu?.renderer || ''} ${device?.gpu?.driver || ''}`.trim();
        }
        if (pluginsPreview) {
          installedStr = pluginsPreview;
        }
        payload = {
          action: SUBMIT_ACTIONS.bug,
          title: `不具合報告: ${bug.title.trim()}`,
          body: lines.join('\n'),
          labels: ['bug', 'from-client'],
          contact: bug.contact.trim() || undefined,
          appVersion: appVersion || undefined,
          os: osStr || undefined,
          cpu: cpuStr || undefined,
          gpu: gpuStr || undefined,
          installed: (installedStr ? installedStr.split('\n').map(s => s.trim()).filter(Boolean) : undefined),
        };
        attachments.forEach(f => { formData.append('files[]', f, f.name || 'attachment'); });
        if (mode === 'bug' && bug.includeLog && appLog) {
          const blob = new Blob([appLog], { type: 'text/plain' });
          formData.append('files[]', blob, 'app.log');
        }
      } else {
        if (!inq.title.trim() || !inq.detail.trim()) {
          setError('タイトルと詳細は必須です');
          return;
        }
        payload = {
          action: SUBMIT_ACTIONS.inquiry,
          title: `問い合わせ: ${inq.title.trim()}`,
          body: inq.detail.trim(),
          labels: ['inquiry', 'from-client'],
          contact: inq.contact.trim() || undefined,
        };
        attachments.forEach(f => { formData.append('files[]', f, f.name || 'attachment'); });
      }

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
      const defaultMessage = packageDialogInfo
        ? '送信が完了しました。'
        : mode === 'bug'
          ? '不具合報告を送信しました。ご協力ありがとうございます。'
          : '意見/問い合わせを送信しました。ありがとうございます。';
      const friendlyMessage = responseJson?.message || responseText || defaultMessage;
      setSuccessDialog({
        open: true,
        message: friendlyMessage,
        url: successUrl || '',
        packageAction: packageDialogInfo?.actionLabel || '',
        packageName: packageDialogInfo?.packageName || '',
        packageId: packageDialogInfo?.packageId || '',
      });
    } catch (err) {
      console.error(err);
      setError(err?.message || '送信に失敗しました。ネットワークや設定をご確認ください。');
    } finally {
      setSubmitting(false);
    }
  }, [mode, packageForm, catalogItems, packageMdFilename, bug, appVersion, device, pluginsPreview, attachments, appLog, inq, submitEndpoint, packageSender]);

  const thumbnailPreview = packageForm.images.thumbnail?.previewUrl || packageForm.images.thumbnail?.existingPath || "";
  const successPrimaryText = successDialog.packageName
    ? `${successDialog.packageAction || '送信完了'}: ${successDialog.packageName}`
    : (successDialog.message || '送信が完了しました。');
  const successSupportText = successDialog.packageName && successDialog.message ? successDialog.message : '';
  return (
    <div className={`submit-page${mode === 'package' ? ' submit-page--package' : ''}`}>
      {successDialog.open && (
        <div className="modal" role="dialog" aria-modal="true" aria-labelledby="submit-success-title">
          <div className="modal__backdrop" onClick={closeSuccessDialog} />
          <div className="modal__dialog modal__dialog--success">
            <div className="modal__header">
              <h3 id="submit-success-title" className="modal__title">送信が完了しました</h3>
            </div>
            <div className="modal__body modal__body--success">
              <div className="modal__success">
                <div className="modal__successIcon" aria-hidden>
                  <Icon name="check_circle" size={28} />
                </div>
                <div>
                  <p className="modal__lead">{successPrimaryText}</p>
                  {successSupportText && <p className="modal__text">{successSupportText}</p>}
                </div>
              </div>
            </div>
            <div className="modal__actions modal__actions--split">
              {successDialog.url && (
                <a
                  className="btn btn--secondary"
                  href={successDialog.url}
                  target="_blank"
                  rel="noreferrer noopener"
                >
                  公開ページを開く
                </a>
              )}
              <button type="button" className="btn btn--primary" onClick={closeSuccessDialog}>閉じる</button>
            </div>
          </div>
        </div>
      )}
      <Header />
      <main className="container">
        <header className="submit-header">
          <h1 className="submit-header__title">フィードバック</h1>
          <p className="submit-header__description">このページから不具合報告・意見/問い合わせ・パッケージ情報を送信できます。</p>
        </header>
        {error && <div className="error" role="alert">{error}</div>}
        <div className="segmented" role="tablist" aria-label="投稿の種類">
          <button type="button" role="tab" aria-selected={mode === 'package'} className={`btn btn--toggle ${mode === 'package' ? 'is-active' : ''}`} onClick={() => setMode('package')}>
            <span aria-hidden><Icon name="package" /></span> パッケージ登録
          </button>
          <button type="button" role="tab" aria-selected={mode === 'bug'} className={`btn btn--toggle ${mode === 'bug' ? 'is-active' : ''}`} onClick={() => setMode('bug')}>
            <span aria-hidden><Icon name="bug" /></span> 不具合報告
          </button>
          <button type="button" role="tab" aria-selected={mode === 'inquiry'} className={`btn btn--toggle ${mode === 'inquiry' ? 'is-active' : ''}`} onClick={() => setMode('inquiry')}>
            <span aria-hidden><Icon name="chat" /></span> 意見/問い合わせ
          </button>
        </div>
        <form className={`form${mode === 'package' ? ' form--package' : ''}`} onSubmit={handleSubmit}>
          {mode === 'bug' && (
            <>
              <div className="visibility-note">
                <VisibilityBadge type="public" />
                <div>
                  不具合報告では <strong>タイトル</strong> と <strong>詳細</strong> が公開されます。連絡先や添付ファイルを含むその他の入力内容は公開されません。
                </div>
              </div>
              <div className="form__grid">
                <label>
                  タイトル* <VisibilityBadge type="public" />
                  <input name="title" value={bug.title} onChange={handleBugChange} required placeholder="タイトルを入力してください。" />
                </label>
                <label>連絡先(任意)<input name="contact" value={bug.contact} onChange={handleBugChange} placeholder="メールや X/Twitter など(必要に応じて)" /></label>
                <label style={{ gridColumn: '1 / -1' }}>
                  詳細* <VisibilityBadge type="public" />
                  <textarea className="textarea--lg" name="detail" value={bug.detail} onChange={handleBugChange} required placeholder="発生状況や再現手順などを入力してください。" />
                </label>
              </div>

              <div className="sidebar">
                <div className="sidebar__header">添付ファイル(任意・複数可)</div>
                <div className="sidebar__group">
                  <input type="file" multiple onChange={onFilesChange} className="allow-contextmenu" />
                  {attachments?.length ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                      {attachments.map((f, i) => (
                        <div key={`${f.name}-${f.size}-${f.lastModified}-${i}`} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <div className="badge" title={f.name} style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {f.path || f.webkitRelativePath || f.name}
                          </div>
                          <DeleteButton onClick={() => removeAttachment(i)} ariaLabel="添付ファイルを削除" />
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="note">スクリーンショットなどを添付できます</div>
                  )}
                </div>
              </div>

              <div className="sidebar">
                <div className="sidebar__header">アプリ情報</div>
                <div className="sidebar__group">
                  <label className="switch">
                    <input type="checkbox" name="includeApp" checked={inq.includeApp} onChange={handleInqChange} />
                    <span className="switch__slider" aria-hidden></span>
                    <span className="switch__label">アプリ情報を添付する</span>
                  </label>
                  <div>アプリのバージョン: {appVersion || '取得できませんでした'}</div>
                  <div>
                    インストール済みプラグイン一覧
                    <pre className="modal__pre pre--wrap pre--scroll">{pluginsPreview || '取得できませんでした'}</pre>
                  </div>
                </div>
              </div>

              <div className="sidebar">
                <div className="sidebar__header">デバイス情報</div>
                {loadingDiag ? <div>読込中</div> : (
                  <div className="sidebar__group">
                    <label className="switch">
                      <input type="checkbox" name="includeDevice" checked={bug.includeDevice} onChange={handleBugChange} />
                      <span className="switch__slider" aria-hidden></span>
                      <span className="switch__label">デバイス情報を添付する</span>
                    </label>
                    <div>OS: {device?.os?.name || ''} {device?.os?.version || ''} ({device?.os?.arch || ''})</div>
                    <div>CPU: {device?.cpu?.model || ''} / コア数: {device?.cpu?.cores || ''}</div>
                    <div>GPU: {device?.gpu?.vendor || ''} {device?.gpu?.renderer || ''} {device?.gpu?.driver || ''}</div>
                  </div>
                )}
              </div>

              <div className="sidebar" style={{ position: 'relative' }}>
                <div className="sidebar__header">アプリログ</div>
                <div className="sidebar__group">
                  <label className="switch">
                    <input type="checkbox" name="includeLog" checked={bug.includeLog} onChange={handleBugChange} />
                    <span className="switch__slider" aria-hidden></span>
                    <span className="switch__label">app.log を添付する</span>
                  </label>
                  {appLog ? <pre className="modal__pre pre--wrap pre--scroll">{appLog}</pre> : <div className="badge">ログが取得できませんでした</div>}
                </div>
              </div>
            </>
          )}

          {mode === 'inquiry' && (
            <>
              <div className="visibility-note">
                <VisibilityBadge type="private" />
                <div>意見・問い合わせの入力内容はすべて非公開です。</div>
              </div>
              <div className="form__grid">
                <label>タイトル*<input name="title" value={inq.title} onChange={handleInqChange} required placeholder="タイトルを入力してください。" /></label>
                <label>連絡先(任意)<input name="contact" value={inq.contact} onChange={handleInqChange} placeholder="メールや X/Twitter など(必要に応じて)" /></label>
                <label style={{ gridColumn: '1 / -1' }}>意見・問い合わせの詳細*<textarea className="textarea--lg" name="detail" value={inq.detail} onChange={handleInqChange} required placeholder="意見・問い合わせの詳細を入力してください。" /></label>
              </div>

              <div className="sidebar">
                <div className="sidebar__header">添付ファイル(任意・複数可)</div>
                <div className="sidebar__group">
                  <input type="file" multiple onChange={onFilesChange} className="allow-contextmenu" />
                  {attachments?.length ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                      {attachments.map((f, i) => (
                        <div key={`${f.name}-${f.size}-${f.lastModified}-${i}`} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <div className="badge" title={f.name} style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {f.path || f.webkitRelativePath || f.name}
                          </div>
                          <DeleteButton onClick={() => removeAttachment(i)} ariaLabel="添付ファイルを削除" />
                        </div>
                      ))}
                    </div>
                  ) : null}
                </div>
              </div>
            </>
          )}
          {mode === 'package' && (
            <div className="package-editor">
              <aside className="package-editor__sidebar">
                <div className="package-editor__search">
                  <input
                    type="search"
                    value={packageSearch}
                    onChange={e => setPackageSearch(e.target.value)}
                    placeholder="パッケージ名・作者名で検索"
                    className="package-editor__searchInput"
                  />
                </div>
                <div className="package-editor__list">
                  <div className="package-editor__listHeader">
                    パッケージ一覧
                  </div>
                  <div className="package-editor__listBody">
                    {catalogLoading && !catalogLoaded ? (
                      <div className="package-editor__state">読み込み中...</div>
                    ) : (
                      filteredPackages.map(item => {
                        const isSelected = selectedPackageId === item.id;
                        return (
                          <button
                            key={item.id}
                            type="button"
                            onClick={() => handleSelectPackage(item)}
                            className={`package-editor__item${isSelected ? ' is-selected' : ''}`}
                          >
                            <span className="package-editor__itemName">{item.name || item.id}</span>
                            <span className="package-editor__itemMeta">{item.author || '作者不明'}</span>
                          </button>
                        );
                      })
                    )}
                    {!catalogLoading && filteredPackages.length === 0 && (
                      <div className="package-editor__state package-editor__state--muted">該当するパッケージがありません</div>
                    )}
                  </div>
                </div>
                <button type="button" className="btn btn--secondary package-editor__newButton" onClick={handleStartNewPackage}>
                  新規でパッケージを追加
                </button>
              </aside>

              <section className="package-editor__form">
                <div className="package-editor__formScroll">
                  <div className="visibility-note visibility-note--package">
                    <VisibilityBadge type="public" />
                    <div>このフォームに入力するプラグイン情報はすべて公開されます。</div>
                  </div>
                  <div className="form__grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))' }}>
                    <label>ID*<input name="id" value={packageForm.id} onChange={e => updatePackageField('id', e.target.value)} required placeholder="英数字のみ(例: Kenkun.AviUtlExEdit2)" /></label>
                    <label>パッケージ名*<input name="name" value={packageForm.name} onChange={e => updatePackageField('name', e.target.value)} required placeholder="(例: AviUtl2)" /></label>
                    <label>作者名*<input name="author" value={packageForm.author} onChange={e => updatePackageField('author', e.target.value)} required placeholder="(例: KENくん)" /></label>
                    <label>オリジナル作者名(任意)<input name="originalAuthor" value={packageForm.originalAuthor} onChange={e => updatePackageField('originalAuthor', e.target.value)} /></label>
                    <label>種類*<input name="type" value={packageForm.type} onChange={e => updatePackageField('type', e.target.value)} required placeholder="入力プラグイン/スクリプト/言語ファイルなど" /></label>
                    <label style={{ gridColumn: '1 / -1' }}>概要*<input name="summary" value={packageForm.summary} maxLength={55} onChange={e => updatePackageField('summary', e.target.value)} required placeholder="概要を55文字以内で入力してください" /></label>
                    <div className="tab-container" style={{ gridColumn: '1 / -1' }}>
                      <div className="tab-container__tabs" role="tablist" aria-label="詳細入力タブ">
                        <button
                          type="button"
                          role="tab"
                          aria-selected={descriptionTab === 'edit'}
                          className={`tab-container__tab ${descriptionTab === 'edit' ? 'is-active' : ''}`}
                          onClick={() => setDescriptionTab('edit')}
                        >
                          Markdown
                        </button>
                        <button
                          type="button"
                          role="tab"
                          aria-selected={descriptionTab === 'preview'}
                          className={`tab-container__tab ${descriptionTab === 'preview' ? 'is-active' : ''}`}
                          onClick={() => setDescriptionTab('preview')}
                        >
                          プレビュー
                        </button>
                      </div>
                      <div className="tab-container__body">
                        <div className="tab-panel">
                          {descriptionTab === 'edit' ? (
                            <textarea
                              className="textarea--lg"
                              value={packageForm.descriptionText}
                              onChange={e => updatePackageField('descriptionText', e.target.value)}
                              required
                              placeholder="パッケージについての詳細情報を入力してください。Markdown形式で記述できます。"
                              style={{ minHeight: 280, resize: 'vertical' }}
                            />
                          ) : (
                            <div className="markdown-preview tab-panel__preview" dangerouslySetInnerHTML={{ __html: renderMarkdown(packageForm.descriptionText) }} />
                          )}
                        </div>
                      </div>
                    </div>

                    <label>パッケージのサイト<input name="repoURL" value={packageForm.repoURL} onChange={e => updatePackageField('repoURL', e.target.value)} placeholder="パッケージのメインページ" /></label>
                    <label>ライセンス*<input name="license" value={packageForm.license} onChange={e => updatePackageField('license', e.target.value)} required placeholder="(例: MIT)" /></label>
                    <label>タグ(カンマ区切り)<input name="tags" value={packageForm.tagsText} onChange={e => updatePackageField('tagsText', e.target.value)} placeholder="(例: エンコード, フィルタ)" /></label>
                    <label>依存パッケージ(現在非対応)<input name="dependencies" value={packageForm.dependenciesText} onChange={e => updatePackageField('dependenciesText', e.target.value)} placeholder="パッケージIDを書いてください" /></label>
                  </div>

                  <section className="package-section">
                    <div className="package-section__header">
                      <h2>画像</h2>
                    </div>
                    <div className="image-upload-grid">
                      <div className="image-upload image-upload--thumbnail">
                        <div className="image-upload__header">
                          <div>
                            <h3 className="image-upload__title">サムネイル</h3>
                            <p className="image-upload__subtitle">最大1枚</p>
                          </div>
                          <label className="image-upload__button">
                            画像を選択
                            <input type="file" accept="image/*" onChange={e => handleThumbnailChange(e.target.files?.[0])} className="image-upload__input" />
                          </label>
                        </div>
                        {packageForm.images.thumbnail ? (
                          <div className="image-card image-card--thumbnail">
                            <div
                              className={`image-card__thumb${thumbnailPreview ? '' : ' image-card__thumb--empty'}`}
                              style={thumbnailPreview ? { backgroundImage: `url(${thumbnailPreview})` } : undefined}
                            >
                              {!thumbnailPreview && <span>プレビューなし</span>}
                            </div>
                            <div className="image-card__footer">
                              <span className="image-card__name" title={packageForm.images.thumbnail.file?.name || packageForm.images.thumbnail.existingPath}>
                                {packageForm.images.thumbnail.file?.name || packageForm.images.thumbnail.existingPath || '未設定'}
                              </span>
                              <DeleteButton onClick={handleRemoveThumbnail} ariaLabel="サムネイルを削除" />
                            </div>
                          </div>
                        ) : (
                          <div className="image-card image-card--empty">サムネイルが未設定です</div>
                        )}
                      </div>
                      <div className="image-upload image-upload--gallery">
                        <div className="image-upload__header">
                          <div>
                            <h3 className="image-upload__title">説明画像</h3>
                            <p className="image-upload__subtitle">複数追加できます</p>
                          </div>
                          <label className="image-upload__button">
                            画像を追加
                            <input type="file" accept="image/*" multiple onChange={e => handleAddInfoImages(e.target.files)} className="image-upload__input" />
                          </label>
                        </div>
                        {packageForm.images.info.length ? (
                          <div className="image-gallery">
                            {packageForm.images.info.map((entry, idx) => {
                              const preview = entry.previewUrl || entry.existingPath || '';
                              const filename = entry.file?.name || entry.existingPath || `./image/${packageForm.id}_${idx + 1}.(拡張子)`;
                              return (
                                <div key={entry.key} className="image-card image-card--gallery">
                                  <div
                                    className={`image-card__thumb${preview ? '' : ' image-card__thumb--empty'}`}
                                    style={preview ? { backgroundImage: `url(${preview})` } : undefined}
                                  >
                                    {!preview && <span>プレビューなし</span>}
                                  </div>
                                  <div className="image-card__footer">
                                    <span className="image-card__name" title={filename}>{filename}</span>
                                    <DeleteButton onClick={() => handleRemoveInfoImage(entry.key)} ariaLabel="説明画像を削除" />
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        ) : (
                          <div className="image-card image-card--empty">説明画像が未設定です</div>
                        )}
                      </div>
                    </div>
                  </section>
                  <section className="package-section">
                    <div className="package-section__header">
                      <h2>インストーラ</h2>
                    </div>
                    <div className="package-section__content">
                      <div>
                        <span className="package-section__label">ダウンロード元</span>
                        <div className="segmented segmented--compact package-section__source">
                          {INSTALLER_SOURCES.map(option => (
                            <button
                              key={option.value}
                              type="button"
                              className={`btn btn--toggle ${packageForm.installer.sourceType === option.value ? 'is-active' : ''}`}
                              onClick={() => updateInstallerField('sourceType', option.value)}
                            >
                              {option.label}
                            </button>
                          ))}
                        </div>
                      </div>
                      {packageForm.installer.sourceType === 'direct' && (
                        <label>ダウンロードURL<input value={packageForm.installer.directUrl} onChange={e => updateInstallerField('directUrl', e.target.value)} placeholder="ダウンロード先のURLを入れてください" /></label>
                      )}
                      {packageForm.installer.sourceType === 'github' && (
                        <div className="form__grid package-grid">
                          <label>GitHub ID<input value={packageForm.installer.githubOwner} onChange={e => updateInstallerField('githubOwner', e.target.value)} placeholder="例: neosku" /></label>
                          <label>レポジトリ名<input value={packageForm.installer.githubRepo} onChange={e => updateInstallerField('githubRepo', e.target.value)} placeholder="例: aviutl2-catalog" /></label>
                          <label className="package-grid__full">ダウンロードファイルの正規表現<input value={packageForm.installer.githubPattern} onChange={e => updateInstallerField('githubPattern', e.target.value)} placeholder="^file.*\.zip$" /></label>
                        </div>
                      )}
                      {packageForm.installer.sourceType === 'GoogleDrive' && (
                        <label>ファイルID<input value={packageForm.installer.googleDriveId} onChange={e => updateInstallerField('googleDriveId', e.target.value)} placeholder="Google Drive ファイルID" /></label>
                      )}
                    </div>

                    <div className="package-subsection">
                      <div className="package-subsection__header">
                        <h3>インストール ステップ</h3>
                        <button type="button" className="btn btn--secondary" onClick={addInstallStep}>ステップを追加</button>
                      </div>
                      <div
                        className="package-cards"
                        ref={installListRef}
                      >
                        {packageForm.installer.installSteps.map((step, idx) => {
                          const order = idx + 1;
                          const isSpecialAction = SPECIAL_INSTALL_ACTIONS.includes(step.action);
                          return (
                            <div
                              key={step.key}
                              className="package-card package-card--minimal"
                            >
                              <div className="package-card__header">
                                <div className="package-card__lead">
                                  <span className="package-card__order" aria-label={`ステップ${order}`}>{order}</span>
                                  {!isSpecialAction && (
                                    <span
                                      className="package-card__handle"
                                      role="button"
                                      tabIndex={0}
                                      onPointerDown={e => startHandleDrag('install', idx, e)}
                                      aria-label="ドラッグして並び替え"
                                    >⋮⋮</span>
                                  )}
                                </div>
                                {isSpecialAction ? (
                                  <div className="package-card__presetAction" aria-label="固定ステップ">
                                    <span className="package-card__presetLabel">{ACTION_LABELS[step.action] || step.action}</span>
                                    <span className="package-card__presetNotice">このステップは固定されています</span>
                                  </div>
                                ) : (
                                  <select className="package-card__select" value={step.action} onChange={e => updateInstallStep(step.key, 'action', e.target.value)}>
                                    {INSTALL_ACTIONS.map(action => (
                                      <option key={action} value={action}>
                                        {ACTION_LABELS[action] || action}
                                      </option>
                                    ))}
                                  </select>
                                )}
                                <div className="package-card__toolbar">
                                  {!isSpecialAction && (
                                    <DeleteButton onClick={() => removeInstallStep(step.key)} ariaLabel="ステップを削除" />
                                  )}
                                </div>
                              </div>
                              {!isSpecialAction && step.action === 'run' && (
                                <div className="package-card__fields package-card__fields--tight">
                                  <label>パス<input value={step.path} onChange={e => updateInstallStep(step.key, 'path', e.target.value)} placeholder="{tmp}/setup.exe" /></label>
                                  <label>引数(コンマ区切り)<input value={step.argsText} onChange={e => updateInstallStep(step.key, 'argsText', e.target.value)} placeholder="--silent, --option" /></label>
                                </div>
                              )}
                              {!isSpecialAction && step.action === 'copy' && (
                                <div className="package-card__fields package-card__fields--tight">
                                  <label>コピー元<input value={step.from} onChange={e => updateInstallStep(step.key, 'from', e.target.value)} placeholder="{tmp}/example.auo2" /></label>
                                  <label>コピー先<input value={step.to} onChange={e => updateInstallStep(step.key, 'to', e.target.value)} placeholder="{pluginsDir}" /></label>
                                </div>
                              )}
                            </div>
                          );
                        })}
                        {!packageForm.installer.installSteps.length && <div className="note">必要な手順を順に追加してください</div>}
                      </div>
                    </div>

                    <div className="package-subsection">
                      <div className="package-subsection__header">
                        <h3>アンインストール ステップ</h3>
                        <button type="button" className="btn btn--secondary" onClick={addUninstallStep}>ステップを追加</button>
                      </div>
                      <div
                        className="package-cards"
                        ref={uninstallListRef}
                      >
                        {packageForm.installer.uninstallSteps.map((step, idx) => {
                          const order = idx + 1;
                          return (
                            <div
                              key={step.key}
                              className="package-card package-card--minimal"
                            >
                              <div className="package-card__header">
                                <div className="package-card__lead">
                                  <span className="package-card__order" aria-label={`ステップ${order}`}>{order}</span>
                                  <span
                                    className="package-card__handle"
                                    role="button"
                                    tabIndex={0}
                                    onPointerDown={e => startHandleDrag('uninstall', idx, e)}
                                    aria-label="ドラッグして並び替え"
                                  >⋮⋮</span>
                                </div>
                                <select className="package-card__select" value={step.action} onChange={e => updateUninstallStep(step.key, 'action', e.target.value)}>
                                  {UNINSTALL_ACTIONS.map(action => (
                                    <option key={action} value={action}>
                                      {ACTION_LABELS[action] || action}
                                    </option>
                                  ))}
                                </select>
                                <div className="package-card__toolbar">
                                  <DeleteButton onClick={() => removeUninstallStep(step.key)} ariaLabel="ステップを削除" />
                                </div>
                              </div>
                              <div className="package-card__fields package-card__fields--tight">
                                <label>パス<input value={step.path} onChange={e => updateUninstallStep(step.key, 'path', e.target.value)} placeholder={step.action === 'delete' ? '(例: {pluginsDir}/example.auo2)' : '(例: {appDir}/uninstall.exe)'} /></label>
                                {step.action === 'run' && (
                                  <label>引数(カンマ区切り)<input value={step.argsText} onChange={e => updateUninstallStep(step.key, 'argsText', e.target.value)} placeholder="(例: /VERYSILENT)" /></label>
                                )}
                              </div>
                            </div>
                          );
                        })}
                        {!packageForm.installer.uninstallSteps.length && <div className="note">必要な手順を順に追加してください</div>}
                      </div>
                    </div>
                  </section>
                  <section className="package-section">
                    <div className="package-section__header">
                      <h2>バージョン</h2>
                    </div>
                    <div className="version-list">
                      {packageForm.versions.map(ver => {
                        const isOpen = expandedVersionKeys.has(ver.key);
                        return (
                          <details key={ver.key} open={isOpen} onToggle={e => toggleVersionOpen(ver.key, e.target.open)} className="version-item">
                            <summary className="version-item__summary">
                              <div className="version-item__meta">
                                <span className="version-item__name">{ver.version || "（バージョン未設定）"}</span>
                                <span className="version-item__date">{ver.release_date || "日付未設定"}</span>
                              </div>
                              <div className="version-item__actions">
                                <div className="badge">ファイル {ver.files.length} 件</div>
                                <DeleteButton
                                  onClick={(e) => { e.preventDefault(); e.stopPropagation(); removeVersion(ver.key); }}
                                  ariaLabel="このバージョンを削除"
                                />
                              </div>
                            </summary>
                            <div className="version-item__body">
                              <div className="version-item__fields version-item__fields--compact">
                                <label>バージョン<input value={ver.version} onChange={e => updateVersionField(ver.key, 'version', e.target.value)} placeholder="v1.0.0" /></label>
                                <label className="version-date">
                                  <span>公開日</span>
                                  <div className="version-date__control">
                                    <input
                                      type="date"
                                      value={ver.release_date}
                                      onChange={e => updateVersionField(ver.key, 'release_date', e.target.value)}
                                      ref={(el) => {
                                        if (el) {
                                          versionDateRefs.current.set(ver.key, el);
                                        } else {
                                          versionDateRefs.current.delete(ver.key);
                                        }
                                      }}
                                    />
                                    <button
                                      type="button"
                                      className="btn btn--icon version-date__btn"
                                      onClick={() => openDatePicker(ver.key)}
                                      aria-label="カレンダーを開く"
                                    >
                                      <Icon name="calendar" size={16} />
                                    </button>
                                  </div>
                                </label>
                              </div>
                              <div className="version-files__header">
                                <div className="version-files__title">
                                  <h3>ファイル</h3>
                                  <p>主要ファイル(最低1件)のハッシュを計算してください。</p>
                                </div>
                              </div>
                              <div className="version-files">
                                {ver.files.map((file, idx) => (
                                  <div key={file.key} className="version-file-card">
                                    <div className="version-file-card__head">
                                      <span className="version-file-card__chip">ファイル {idx + 1}</span>
                                      <DeleteButton onClick={() => removeVersionFile(ver.key, file.key)} ariaLabel={`ファイル${idx + 1}を削除`} />
                                    </div>
                                    <label>保存先パス<input value={file.path} onChange={e => updateVersionFile(ver.key, file.key, 'path', e.target.value)} placeholder="{pluginsDir}/plugin.dll" /></label>
                                    <div className="version-file-card__metaRow">
                                      <dl className="version-file-card__summary">
                                        <div>
                                          <dt>ハッシュ値</dt>
                                          <dd>{file.hash ? file.hash : '未計算'}</dd>
                                        </div>
                                        {file.fileName ? (
                                          <div>
                                            <dt>ファイル名</dt>
                                            <dd>{file.fileName}</dd>
                                          </div>
                                        ) : null}
                                      </dl>
                                      <button
                                        type="button"
                                        className="btn version-file-card__actionButton"
                                        onClick={() => chooseFileForHash(ver.key, file.key)}
                                      >
                                        ファイルを選択して計算
                                      </button>
                                    </div>
                                  </div>
                                ))}
                                {!ver.files.length && <div className="note">ファイルを追加してください</div>}
                                <div className="version-files__footer">
                                  <button type="button" className="btn btn--secondary version-files__add" onClick={() => addVersionFile(ver.key)}>
                                    ＋ ファイルを追加
                                  </button>
                                </div>
                              </div>
                            </div>
                          </details>
                        );
                      })}
                      {!packageForm.versions.length && <div className="note">バージョン情報を追加してください。</div>}
                    </div>
                    <div className="version-add">
                      <button
                        type="button"
                        className="btn btn--secondary version-add__button"
                        onClick={addVersion}
                        aria-label="バージョンを追加"
                      >
                        <span aria-hidden>＋</span>
                        <span>バージョンを追加</span>
                      </button>
                    </div>
                  </section>
                </div>
                <div className="package-editor__footerRow">
                  <div className="package-editor__footerButtons">
                    {packageGuideUrl && (
                      <a
                        className="btn btn--secondary"
                        href={packageGuideUrl}
                        target="_blank"
                        rel="noreferrer noopener"
                      >
                        説明サイトを見る
                      </a>
                    )}
                    <div className="package-editor__sender">
                      <input
                        type="text"
                        value={packageSender}
                        onChange={e => setPackageSender(e.target.value)}
                        placeholder="送信者のニックネーム(任意・公開)"
                        aria-label="送信者のニックネーム(任意・公開)"
                      />
                    </div>
                    <button type="submit" className="btn btn--primary" disabled={submitting}>
                      {submitting ? '送信中…' : '送信'}
                    </button>
                  </div>
                </div>
              </section>
            </div>
          )}

          {mode !== 'package' && (
            <button type="submit" className="fab fab--submit" disabled={submitting}>
              {submitting ? '送信中…' : '送信'}
            </button>
          )}
        </form>
      </main>
    </div>
  );
}
