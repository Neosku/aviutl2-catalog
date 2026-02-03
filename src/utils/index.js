// アプリ全体で用いるユーティリティをまとめたファイル

// -------------------------
// 基本的なユーティリティ関数
// -------------------------

// テキスト正規化関数
// 全角→半角変換、カタカナ→ひらがな変換など統一的な検索処理のために使用
export function normalize(input) {
  if (!input) return '';
  // 文字列に変換し前後の空白を削除して小文字化
  let s = String(input).trim().toLowerCase();
  // 全角英数記号を半角に変換
  s = s.replace(/[！-～]/g, (ch) => String.fromCharCode(ch.charCodeAt(0) - 0xfee0));
  // 全角スペースを半角スペースに変換
  s = s.replace(/　/g, ' ');
  // カタカナをひらがなに変換
  s = s.replace(/[ァ-ヶ]/g, (ch) => String.fromCharCode(ch.charCodeAt(0) - 0x60));
  return s;
}

// 名前を昇順で比較する関数
// aの名前がbの名前より辞書順で後の時1、前の時-1、同じ時0を返す
function cmpNameAsc(a, b) {
  const x = a.nameKey || '';
  const y = b.nameKey || '';
  return x < y ? -1 : x > y ? 1 : 0;
}

function toFiniteNumber(value) {
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

const pad2 = (n) => String(n).padStart(2, '0');

// タイムスタンプから "YYYY-MM-DD" の形式に変換する関数
// 無効な値(null, undefined, NaNなど)や不正な日付は空文字列を返す
// 必要か要件等
export function formatDate(ts) {
  if (ts == null) return '';
  const d = new Date(ts);
  if (isNaN(+d)) return '';
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}

// -------------------------
// 検索・フィルタリング・ソート
// -------------------------

// 検索を行う関数
// 検索クエリをアイテムの name/author/summary に対して AND 条件で部分一致検索
// JavaScript側での実装を維持（高速化は将来的にRust側で実装）
export function matchQuery(item, q) {
  if (!q) return true;
  const keys = [item.nameKey, item.authorKey, item.summaryKey];
  const terms = normalize(q).split(/\s+/).filter(Boolean);
  return terms.every((t) => keys.some((k) => k.includes(t)));
}

// 絞り込みを行う関数
// 種類とタグでの絞り込みを行う
// JavaScript側での実装を維持（高速化は将来的にRust側で実装）
export function filterByTagsAndType(items, tags = [], types = []) {
  return items.filter((it) => {
    const tagOk = !tags?.length || (it.tags || []).some((t) => tags.includes(t));
    const typeOk = !types?.length || types.includes(it.type);
    return tagOk && typeOk;
  });
}

// ソート基準と方向に応じて比較結果を返す関数
// key='name'なら名前の昇順/降順、key='newest'なら更新日時、key='popularity'なら人気順で比較
// updatedAtがnullのものは常に末尾に回し、同値の場合は名前順で判定する
export function getSorter(key = 'newest', dir = 'desc') {
  if (key === 'name') {
    if (dir === 'desc') return (a, b) => -cmpNameAsc(a, b);
    return cmpNameAsc;
  }
  if (key === 'popularity') {
    const compareByUpdatedAt = (a, b) => {
      const d =
        (b.updatedAt == null ? Number.NEGATIVE_INFINITY : b.updatedAt) -
        (a.updatedAt == null ? Number.NEGATIVE_INFINITY : a.updatedAt);
      return d || cmpNameAsc(a, b);
    };
    if (dir === 'asc') {
      return (a, b) => {
        const ap = toFiniteNumber(a.popularityScore ?? a.popularity);
        const bp = toFiniteNumber(b.popularityScore ?? b.popularity);
        const d = (ap == null ? Number.POSITIVE_INFINITY : ap) - (bp == null ? Number.POSITIVE_INFINITY : bp);
        return d || compareByUpdatedAt(a, b);
      };
    }
    return (a, b) => {
      const ap = toFiniteNumber(a.popularityScore ?? a.popularity);
      const bp = toFiniteNumber(b.popularityScore ?? b.popularity);
      const d = (bp == null ? Number.NEGATIVE_INFINITY : bp) - (ap == null ? Number.NEGATIVE_INFINITY : ap);
      return d || compareByUpdatedAt(a, b);
    };
  }
  if (key === 'trend') {
    const compareByUpdatedAt = (a, b) => {
      const d =
        (b.updatedAt == null ? Number.NEGATIVE_INFINITY : b.updatedAt) -
        (a.updatedAt == null ? Number.NEGATIVE_INFINITY : a.updatedAt);
      return d || cmpNameAsc(a, b);
    };
    if (dir === 'asc') {
      return (a, b) => {
        const ap = toFiniteNumber(a.trend);
        const bp = toFiniteNumber(b.trend);
        const d = (ap == null ? Number.POSITIVE_INFINITY : ap) - (bp == null ? Number.POSITIVE_INFINITY : bp);
        return d || compareByUpdatedAt(a, b);
      };
    }
    return (a, b) => {
      const ap = toFiniteNumber(a.trend);
      const bp = toFiniteNumber(b.trend);
      const d = (bp == null ? Number.NEGATIVE_INFINITY : bp) - (ap == null ? Number.NEGATIVE_INFINITY : ap);
      return d || compareByUpdatedAt(a, b);
    };
  }
  if (key === 'added') {
    if (dir === 'asc') {
      return (a, b) => {
        const ap = toFiniteNumber(a.catalogIndex);
        const bp = toFiniteNumber(b.catalogIndex);
        const d = (ap == null ? Number.POSITIVE_INFINITY : ap) - (bp == null ? Number.POSITIVE_INFINITY : bp);
        return d || cmpNameAsc(a, b);
      };
    }
    return (a, b) => {
      const ap = toFiniteNumber(a.catalogIndex);
      const bp = toFiniteNumber(b.catalogIndex);
      const d = (bp == null ? Number.NEGATIVE_INFINITY : bp) - (ap == null ? Number.NEGATIVE_INFINITY : ap);
      return d || cmpNameAsc(a, b);
    };
  }
  if (dir === 'asc') {
    return (a, b) => {
      const d =
        (a.updatedAt == null ? Number.POSITIVE_INFINITY : a.updatedAt) -
        (b.updatedAt == null ? Number.POSITIVE_INFINITY : b.updatedAt);
      return d || cmpNameAsc(a, b);
    };
  }
  return (a, b) => {
    const d =
      (b.updatedAt == null ? Number.NEGATIVE_INFINITY : b.updatedAt) -
      (a.updatedAt == null ? Number.NEGATIVE_INFINITY : a.updatedAt);
    return d || cmpNameAsc(a, b);
  };
}

// -------------------------
// インストール状態の記録
// -------------------------

// インストールされているプラグインのIDとバージョンをjsonに保存
// スキーマ: { [id: string]: string /* version */ }
const INSTALLED_FILE = 'installed.json';
const CATALOG_CACHE_DIR = 'catalog';
const CATALOG_CACHE_FILE = `${CATALOG_CACHE_DIR}/index.json`;

// カタログキャッシュ(index.json)を読み込み
export async function readCatalogCache() {
  const fs = await import('@tauri-apps/plugin-fs');
  const raw = await fs.readTextFile(CATALOG_CACHE_FILE, { baseDir: fs.BaseDirectory.AppConfig });
  const trimmed = typeof raw === 'string' ? raw.trim() : '';
  if (!trimmed) {
    throw new Error('catalog cache is empty');
  }
  try {
    return JSON.parse(raw);
  } catch (e) {
    throw new Error(`catalog cache parse failed: ${e?.message || e}`, { cause: e });
  }
}

function normalizeCatalogData(data) {
  if (Array.isArray(data)) return data;
  if (data && typeof data === 'object') {
    const fromPackages = data.packages;
    if (Array.isArray(fromPackages)) return fromPackages;
  }
  return [];
}

function deriveCatalogBaseUrl(rootUrl) {
  if (!rootUrl || typeof rootUrl !== 'string') return null;
  const trimmed = rootUrl.trim();
  if (!trimmed) return null;
  const origin =
    typeof window !== 'undefined' && window.location && window.location.href
      ? window.location.href
      : 'app://localhost/';
  try {
    const resolved = new URL(trimmed, origin);
    const dir = new URL('.', resolved);
    return dir.toString();
  } catch {
    const withoutQuery = trimmed.split(/[?#]/)[0];
    const idx = withoutQuery.lastIndexOf('/');
    if (idx >= 0) {
      return withoutQuery.slice(0, idx + 1);
    }
    return null;
  }
}

function resolveCatalogAssetUrl(raw, baseUrl) {
  if (typeof raw !== 'string') return '';
  const trimmed = raw.trim();
  if (!trimmed) return '';
  if (baseUrl) {
    try {
      return new URL(trimmed, baseUrl).toString();
    } catch {
      /* fall through */
    }
  }
  return trimmed;
}

function applyCatalogAssetBase(items, baseUrl) {
  if (!Array.isArray(items)) return [];
  return items.map((item) => {
    const hasImages = Array.isArray(item?.images);
    const groups = hasImages
      ? item.images.map((group) => {
          if (!group || typeof group !== 'object') return group;
          const next = { ...group };
          if (typeof group.thumbnail === 'string') {
            next.thumbnail = resolveCatalogAssetUrl(group.thumbnail, baseUrl);
          }
          const infoImages = Array.isArray(group.infoImg) ? group.infoImg : [];
          next.infoImg = infoImages.map((src) => resolveCatalogAssetUrl(src, baseUrl)).filter(Boolean);
          return next;
        })
      : null;
    let description = item.description;
    if (typeof description === 'string') {
      const trimmed = description.trim();
      if (/\.md$/i.test(trimmed)) {
        const resolved = resolveCatalogAssetUrl(trimmed, baseUrl);
        if (resolved) description = resolved;
      }
    }
    const nextItem = { ...item, description };
    if (hasImages) nextItem.images = groups || [];
    return nextItem;
  });
}

export async function writeCatalogCache(data) {
  const fs = await import('@tauri-apps/plugin-fs');
  const payload = Array.isArray(data) ? data : normalizeCatalogData(data);
  await fs.mkdir(CATALOG_CACHE_DIR, { baseDir: fs.BaseDirectory.AppConfig, recursive: true });
  await fs.writeTextFile(CATALOG_CACHE_FILE, JSON.stringify(payload, null, 2), { baseDir: fs.BaseDirectory.AppConfig });
  return payload;
}

export async function loadCatalogData(options = {}) {
  const remote = import.meta.env.VITE_REMOTE;
  const timeoutMs = Number.isFinite(options.timeoutMs) ? options.timeoutMs : 10000;
  let items = null;
  let source = null;
  let lastError = null;
  let assetBase = deriveCatalogBaseUrl(remote);

  if (remote) {
    try {
      const ctrl = new AbortController();
      const timer = setTimeout(() => ctrl.abort(), timeoutMs);
      const res = await fetch(remote, { signal: ctrl.signal });
      clearTimeout(timer);
      if (res.ok) {
        const json = await res.json();
        const normalized = normalizeCatalogData(json);
        const resolvedBase = deriveCatalogBaseUrl(res.url || remote) || assetBase;
        assetBase = resolvedBase;
        items = applyCatalogAssetBase(normalized, assetBase);
        source = 'remote';
        try {
          await writeCatalogCache(items);
        } catch (cacheError) {
          await logError(`[catalog] cache write failed: ${cacheError?.message || cacheError}`);
        }
      } else {
        lastError = new Error(`remote fetch http ${res.status}`);
        await logError(`[catalog] remote fetch failed: HTTP ${res.status}`);
      }
    } catch (e) {
      lastError = e;
      await logError(`[catalog] remote fetch threw: ${e?.message || e}`);
    }
  }

  if (items == null) {
    try {
      const cache = await readCatalogCache();
      const normalized = normalizeCatalogData(cache);
      items = applyCatalogAssetBase(normalized, assetBase);
      source = 'cache';
    } catch (e) {
      lastError = e;
      await logError(`[catalog] cache read failed: ${e?.message || e}`);
    }
  }

  if (items == null) {
    if (lastError) throw lastError;
    throw new Error('catalog data unavailable');
  }

  return { items, source };
}

// installed.jsonからインストールパッケージ一覧を読み込み（RustとJSを統合）
export async function loadInstalledMap() {
  try {
    const { invoke } = await import('@tauri-apps/api/core');
    return await invoke('get_installed_map_cmd');
  } catch (e) {
    await logError(`[loadInstalledMap] invoke fallback: ${e?.message || e}`);
  }
}

// installed.jsonにインストールパッケージ一覧を書き込み(廃止予定)
async function writeInstalledMap(map) {
  const fs = await import('@tauri-apps/plugin-fs');
  try {
    await fs.writeTextFile(INSTALLED_FILE, JSON.stringify(map, null, 2), { baseDir: fs.BaseDirectory.AppConfig });
  } catch (e) {
    try {
      await logError(`[writeInstalledMap] failed: ${e?.message || e}`);
    } catch {}
  }
  return map;
}

// installed.jsonにIDとバージョンを追加
async function addInstalledId(id, version = '') {
  try {
    const { invoke } = await import('@tauri-apps/api/core');
    await invoke('add_installed_id_cmd', { id, version: String(version || '') });
  } catch (e) {
    try {
      await logError(`[addInstalledId] invoke failed, fallback to file: ${e?.message || e}`);
    } catch {}
  }
}

// installed.jsonから指定IDを削除
export async function removeInstalledId(id) {
  try {
    const { invoke } = await import('@tauri-apps/api/core');
    await invoke('remove_installed_id_cmd', { id });
  } catch (e) {
    try {
      await logError(`[removeInstalledId] invoke failed, fallback to file: ${e?.message || e}`);
    } catch {}
  }
}

// 検出したインストール済みパッケージをinstalled.jsonに保存
export async function saveInstalledSnapshot(detectedMap) {
  const snapshot = {};
  if (detectedMap && typeof detectedMap === 'object') {
    for (const [id, ver] of Object.entries(detectedMap)) {
      if (ver) snapshot[id] = String(ver);
    }
  }
  await writeInstalledMap(snapshot);
  return snapshot;
}

// latestバージョンを推定する関数
// 将来的に廃止予定、index.jsonに記載することを検討
export function latestVersionOf(item) {
  if (!item) return '';
  const arr = Array.isArray(item.versions) ? item.versions : Array.isArray(item.version) ? item.version : [];
  if (!arr.length) return '';
  const last = arr[arr.length - 1];
  return last?.version || '';
}

// -------------------------
// settings.jsonの読み込み
// -------------------------

// 設定の永続化（AviUtl2 ルートと主要サブディレクトリなど）
const SETTINGS_FILE = 'settings.json';

// UI から利用するエクスポート関数
// settings.jsonに保存されている設定を読み込み
export async function getSettings() {
  const fs = await import('@tauri-apps/plugin-fs');
  try {
    const exists = await fs.exists(SETTINGS_FILE, { baseDir: fs.BaseDirectory.AppConfig });
    if (!exists) return {};
    const raw = await fs.readTextFile(SETTINGS_FILE, { baseDir: fs.BaseDirectory.AppConfig });
    const data = JSON.parse(raw || '{}');
    return data && typeof data === 'object' ? data : {};
  } catch (e) {
    try {
      await logError(`[getSettings] failed: ${e?.message || e}`);
    } catch {
      /* ログ失敗時は無視 */
    }
    return {};
  }
}

// -------------------------
// パッケージ状態の統計送信
// -------------------------

const PACKAGE_STATE_ENDPOINT = (import.meta.env.VITE_PACKAGE_STATE_ENDPOINT || '').trim();
const PACKAGE_STATE_PENDING_FILE = 'pending_events.json';
const PACKAGE_STATE_META_FILE = 'package_state.json';
const PACKAGE_STATE_SNAPSHOT_INTERVAL_SEC = 60 * 60 * 24 * 7;

let packageStateQueueOp = Promise.resolve();
let packageStateClientVersion = null;
// キュー操作を直列化して実行
function runPackageStateQueueOp(task) {
  packageStateQueueOp = packageStateQueueOp.then(task, task);
  return packageStateQueueOp;
}
// 現在のUnix秒を取得
function nowUnixSeconds() {
  return Math.floor(Date.now() / 1000);
}
// UUIDv4を生成
function generateUuidV4() {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  if (typeof crypto !== 'undefined' && typeof crypto.getRandomValues === 'function') {
    const buf = new Uint8Array(16);
    crypto.getRandomValues(buf);
    buf[6] = (buf[6] & 0x0f) | 0x40;
    buf[8] = (buf[8] & 0x3f) | 0x80;
    const hex = Array.from(buf, (b) => b.toString(16).padStart(2, '0')).join('');
    return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
  }
  return `uuid-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}
// バージョンをキャッシュ付きで取得
async function getClientVersionCached() {
  if (typeof packageStateClientVersion === 'string') return packageStateClientVersion;
  try {
    const app = await import('@tauri-apps/api/app');
    const v = app?.getVersion ? await app.getVersion() : '';
    packageStateClientVersion = String(v || '');
  } catch (e) {
    packageStateClientVersion = '';
    try {
      await logError(`[package-state] getVersion failed: ${e?.message || e}`);
    } catch {}
  }
  return packageStateClientVersion;
}
// JSONファイルを読み込み
async function readAppConfigJson(relPath, fallback) {
  const fs = await import('@tauri-apps/plugin-fs');
  try {
    const exists = await fs.exists(relPath, { baseDir: fs.BaseDirectory.AppConfig });
    if (!exists) return fallback;
    const raw = await fs.readTextFile(relPath, { baseDir: fs.BaseDirectory.AppConfig });
    const trimmed = typeof raw === 'string' ? raw.trim() : '';
    if (!trimmed) return fallback;
    const parsed = JSON.parse(raw);
    return parsed ?? fallback;
  } catch (e) {
    try {
      await logError(`[package-state] read ${relPath} failed: ${e?.message || e}`);
    } catch {}
    return fallback;
  }
}
// JSONファイルを書き込み
async function writeAppConfigJson(relPath, data) {
  const fs = await import('@tauri-apps/plugin-fs');
  try {
    await fs.writeTextFile(relPath, JSON.stringify(data, null, 2), { baseDir: fs.BaseDirectory.AppConfig });
  } catch (e) {
    try {
      await logError(`[package-state] write ${relPath} failed: ${e?.message || e}`);
    } catch {}
  }
}
// JSONファイルを削除
async function removeAppConfigFile(relPath) {
  const fs = await import('@tauri-apps/plugin-fs');
  try {
    const exists = await fs.exists(relPath, { baseDir: fs.BaseDirectory.AppConfig });
    if (!exists) return;
    await fs.remove(relPath, { baseDir: fs.BaseDirectory.AppConfig });
  } catch (e) {
    try {
      await logError(`[package-state] remove ${relPath} failed: ${e?.message || e}`);
    } catch {}
  }
}
// メタ情報を正規化
function normalizePackageStateMeta(raw) {
  const uid = raw && typeof raw.uid === 'string' ? raw.uid : '';
  const ts = Number.isFinite(raw?.last_snapshot_ts) ? raw.last_snapshot_ts : 0;
  return { uid, last_snapshot_ts: ts };
}
// メタ情報を読み込み・保存
async function loadPackageStateMeta() {
  const raw = await readAppConfigJson(PACKAGE_STATE_META_FILE, {});
  return normalizePackageStateMeta(raw);
}
// メタ情報を保存
async function savePackageStateMeta(meta) {
  const normalized = normalizePackageStateMeta(meta || {});
  await writeAppConfigJson(PACKAGE_STATE_META_FILE, normalized);
  return normalized;
}
// キューを読み込み・保存
async function loadPackageStateQueue() {
  const raw = await readAppConfigJson(PACKAGE_STATE_PENDING_FILE, []);
  return Array.isArray(raw) ? raw : [];
}
// キューを保存
async function savePackageStateQueue(queue) {
  const list = Array.isArray(queue) ? queue : [];
  if (!list.length) {
    await removeAppConfigFile(PACKAGE_STATE_PENDING_FILE);
    return [];
  }
  await writeAppConfigJson(PACKAGE_STATE_PENDING_FILE, list);
  return list;
}
// 現在のウィンドウラベルを取得
async function getCurrentWindowLabel() {
  try {
    const mod = await import('@tauri-apps/api/window');
    const getCurrent =
      typeof mod.getCurrent === 'function'
        ? mod.getCurrent
        : typeof mod.getCurrentWindow === 'function'
          ? mod.getCurrentWindow
          : null;
    const win = getCurrent ? getCurrent() : mod.appWindow || null;
    if (!win) return '';
    if (typeof win.label === 'string') return win.label;
    if (typeof win.label === 'function') return await win.label();
  } catch (e) {
    try {
      await logError(`[package-state] getCurrentWindowLabel failed: ${e?.message || e}`);
    } catch {}
  }
  return '';
}
// 送信をスキップすべきか判定
async function shouldSkipPackageState() {
  if (!PACKAGE_STATE_ENDPOINT) return true;
  try {
    const settings = await getSettings();
    if (settings?.package_state_opt_out) return true;
  } catch {}
  const label = await getCurrentWindowLabel();
  return label === 'init-setup';
}
// UIDを取得・生成
async function getOrCreatePackageStateUid() {
  const meta = await loadPackageStateMeta();
  if (meta.uid) return meta.uid;
  meta.uid = generateUuidV4();
  await savePackageStateMeta(meta);
  return meta.uid;
}
// パッケージ状態イベントを作成
async function createPackageStateEvent(type, extra) {
  const uid = await getOrCreatePackageStateUid();
  const event_id = generateUuidV4();
  const ts = nowUnixSeconds();
  const client_version = await getClientVersionCached();
  return { uid, event_id, ts, type, client_version, ...extra };
}
// パッケージ状態イベントを送信
async function postPackageStateEvent(event) {
  const res = await fetch(PACKAGE_STATE_ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(event),
  });
  if (!res.ok) {
    throw new Error(`HTTP ${res.status}`);
  }
}
// パッケージ状態イベントの説明を生成
function describePackageStateEvent(event) {
  const type = event?.type ? String(event.type) : 'unknown';
  if (type === 'snapshot') {
    const count = Array.isArray(event?.installed) ? event.installed.length : 0;
    return `type=snapshot installed=${count}`;
  }
  const pkg = event?.package_id ? String(event.package_id) : '';
  return pkg ? `type=${type} package_id=${pkg}` : `type=${type}`;
}
// キューをフラッシュ（送信）する内部関数
async function flushPackageStateQueueInternal(preloadedQueue) {
  if (await shouldSkipPackageState()) return;
  let queue = Array.isArray(preloadedQueue) ? preloadedQueue : await loadPackageStateQueue();
  if (!queue.length) return;

  const remaining = [];
  for (let i = 0; i < queue.length; i++) {
    const event = queue[i];
    try {
      await postPackageStateEvent(event);
      try {
        await logInfo(`[package-state] sent ${describePackageStateEvent(event)}`);
      } catch {}
      if (event?.type === 'snapshot' && Number.isFinite(event?.ts)) {
        const meta = await loadPackageStateMeta();
        if (event.ts > meta.last_snapshot_ts) {
          meta.last_snapshot_ts = event.ts;
          await savePackageStateMeta(meta);
        }
      }
    } catch (e) {
      remaining.push(event, ...queue.slice(i + 1));
      try {
        await logError(`[package-state] send failed: ${e?.message || e}`);
      } catch {}
      break;
    }
  }
  await savePackageStateQueue(remaining);
}
// パッケージ状態イベントをキューに追加
async function enqueuePackageStateEvent(event) {
  const queue = await loadPackageStateQueue();
  queue.push(event);
  await savePackageStateQueue(queue);
  await flushPackageStateQueueInternal(queue);
}
// パッケージ状態キューを送信
export async function flushPackageStateQueue() {
  return runPackageStateQueueOp(() => flushPackageStateQueueInternal());
}
// パッケージ状態のローカル状態をリセット
export async function resetPackageStateLocalState() {
  return runPackageStateQueueOp(async () => {
    await removeAppConfigFile(PACKAGE_STATE_PENDING_FILE);
    const meta = await loadPackageStateMeta();
    meta.last_snapshot_ts = 0;
    await savePackageStateMeta(meta);
  });
}
// パッケージ状態イベントを記録
export async function recordPackageStateEvent(type, packageId) {
  return runPackageStateQueueOp(async () => {
    if (await shouldSkipPackageState()) return;
    const id = String(packageId || '').trim();
    if (!id) return;
    const event = await createPackageStateEvent(type, { package_id: id });
    await enqueuePackageStateEvent(event);
  });
}
// インストール済みパッケージのスナップショットを記録
export async function maybeSendPackageStateSnapshot(detectedMap) {
  return runPackageStateQueueOp(async () => {
    if (await shouldSkipPackageState()) return;
    const installed = Object.entries(detectedMap || {})
      .filter(([, v]) => v)
      .map(([id]) => String(id));
    const now = nowUnixSeconds();
    const meta = await loadPackageStateMeta();
    const queue = await loadPackageStateQueue();
    const hasPendingSnapshot = queue.some((evt) => evt && evt.type === 'snapshot');
    const due = !meta.last_snapshot_ts || now - meta.last_snapshot_ts >= PACKAGE_STATE_SNAPSHOT_INTERVAL_SEC;
    if (!hasPendingSnapshot && due) {
      const event = await createPackageStateEvent('snapshot', { installed });
      queue.push(event);
      await savePackageStateQueue(queue);
    }
    await flushPackageStateQueueInternal(queue);
  });
}

// -------------------------
// ログ出力　OK
// -------------------------

// ログを出力する
export function logInfo(msg) {
  return logLine('INFO', msg);
}
export function logError(msg) {
  return logLine('ERROR', msg);
}

// Rust側の log_cmd を呼び出す
async function logLine(level, msg) {
  try {
    const { invoke } = await import('@tauri-apps/api/core');
    await invoke('log_cmd', { level: String(level), msg: String(msg) });
  } catch {}
}

// -------------------------
// 診断（OS/GPU/インストール済みアプリ、app.log）
// 診断時のみ実行するためこのままでOK（後回し）
// -------------------------

const LOG_FILE = 'logs/app.log';

// OS/CPU/GPU/プラグインなどの環境情報を収集
export async function collectDeviceInfo() {
  const info = { os: {}, cpu: {}, gpu: {}, installedApps: [], installedPlugins: [] };
  // OS情報を取得
  try {
    const shell = await import('@tauri-apps/plugin-shell');
    const ps = shell.Command.create('powershell', [
      '-NoLogo',
      '-NoProfile',
      '-NonInteractive',
      '-ExecutionPolicy',
      'Bypass',
      '-Command',
      "(Get-CimInstance -ClassName Win32_OperatingSystem | Select-Object -First 1 @{N='Platform';E={'Windows'}}, @{N='Version';E={$_.Version}}, @{N='Arch';E={$env:PROCESSOR_ARCHITECTURE}}) | ConvertTo-Json -Compress",
    ]);
    const out = await ps.execute();
    if (out.code === 0 && out.stdout) {
      try {
        const obj = JSON.parse(out.stdout);
        info.os = { name: obj.Platform || 'Windows', version: obj.Version || '', arch: obj.Arch || '' };
      } catch {
        info.os = { name: 'Windows', version: '', arch: '' };
      }
    } else {
      info.os = { name: 'Windows', version: '', arch: '' };
    }
  } catch (e) {
    try {
      await logError(`[collectDeviceInfo] OS query failed: ${e?.message || e}`);
    } catch {}
  }

  // CPU情報を取得
  try {
    const shell = await import('@tauri-apps/plugin-shell');
    const ps = shell.Command.create('powershell', [
      '-NoLogo',
      '-NoProfile',
      '-NonInteractive',
      '-ExecutionPolicy',
      'Bypass',
      '-Command',
      '(Get-CimInstance Win32_Processor | Select-Object -First 1 Name, Manufacturer, MaxClockSpeed, NumberOfCores, NumberOfLogicalProcessors, ProcessorId) | ConvertTo-Json -Compress',
    ]);
    const out = await ps.execute();
    if (out.code === 0 && out.stdout) {
      const c = JSON.parse(out.stdout);
      info.cpu = {
        model: c?.Name || '',
        manufacturer: c?.Manufacturer || '',
        maxClockMHz: c?.MaxClockSpeed || undefined,
        cores: c?.NumberOfCores || undefined,
        logicalProcessors: c?.NumberOfLogicalProcessors || undefined,
        id: c?.ProcessorId || '',
      };
    }
  } catch (e) {
    try {
      await logError(`[collectDeviceInfo] CPU query failed: ${e?.message || e}`);
    } catch {}
  }

  // GPU情報を取得
  const shell = await import('@tauri-apps/plugin-shell');
  const ps = shell.Command.create('powershell', [
    '-NoLogo',
    '-NoProfile',
    '-NonInteractive',
    '-ExecutionPolicy',
    'Bypass',
    '-Command',
    "$ErrorActionPreference='SilentlyContinue'; $g=Get-CimInstance Win32_VideoController | Select-Object Name, AdapterCompatibility, DriverVersion, DriverDate, VideoProcessor, AdapterRAM | Sort-Object AdapterRAM -Descending | ConvertTo-Json -Compress; $g",
  ]);
  const out = await ps.execute();
  if (out.code === 0 && out.stdout) {
    let arr = [];
    try {
      arr = JSON.parse(out.stdout);
    } catch {
      arr = [];
    }
    const list = Array.isArray(arr) ? arr : arr ? [arr] : [];
    const nonBasic = list.filter((x) => (x?.Name || '').toLowerCase().indexOf('microsoft basic render') === -1);
    const preferred = nonBasic[0] || list[0] || {};
    info.gpu = {
      name: preferred?.Name || '',
      vendor: preferred?.AdapterCompatibility || '',
      driver: preferred?.DriverVersion || '',
      driverDate: preferred?.DriverDate || '',
      processor: preferred?.VideoProcessor || '',
    };
  }
  return info;
}

// app.logを読み込み
export async function readAppLog() {
  try {
    const fs = await import('@tauri-apps/plugin-fs');
    const exists = await fs.exists(LOG_FILE, { baseDir: fs.BaseDirectory.AppConfig });
    if (!exists) return '';
    const text = await fs.readTextFile(LOG_FILE, { baseDir: fs.BaseDirectory.AppConfig });
    return text || '';
  } catch (e) {
    try {
      await logError(`[readAppLog] failed: ${e?.message || e}`);
    } catch {}
    return '';
  }
}

// -------------------------
// ハッシュ計算・インストール済みバージョン検出
// -------------------------

// 指定パッケージのインストール済みバージョンを検出（Rust実装を使用）
export async function detectInstalledVersionsMap(items) {
  const list = Array.isArray(items) ? items : [];
  const { invoke } = await import('@tauri-apps/api/core');
  const res = await invoke('detect_versions_map', { items: list });
  return res && typeof res === 'object' ? res : {};
}

// -------------------------
// aviutl2.exe の起動確認
// -------------------------
async function ensureAviutlClosed() {
  let running = false;
  try {
    const { invoke } = await import('@tauri-apps/api/core');
    running = !!(await invoke('is_aviutl_running'));
  } catch (e) {
    const detail = e?.message || (typeof e === 'string' ? e : '不明なエラー');
    try {
      await logError(`[process-check] failed to query process state: ${detail}`);
    } catch {}
    throw new Error(`AviUtl2の起動状況を確認できませんでした: ${detail}`, { cause: e });
  }
  if (running) {
    try {
      await logError(`[process-check] aviutl2.exe is running; aborting operation.`);
    } catch {}
    throw new Error('AviUtl2 が起動中です。\nインストールやアンインストールを行う前にアプリを終了してください。');
  }
}

// 文字列内のマクロに実際の値を埋め込み
async function expandMacros(s, ctx) {
  const { invoke } = await import('@tauri-apps/api/core');
  const dirs = await invoke('get_app_dirs');
  //   logInfo(`get_app_dirs: ${JSON.stringify(dirs)}`);
  if (typeof s !== 'string') return s;
  return s
    .replaceAll('{tmp}', ctx.tmpDir)
    .replaceAll('{appDir}', dirs.aviutl2_root || '')
    .replaceAll('{pluginsDir}', dirs.plugin_dir || '')
    .replaceAll('{scriptsDir}', dirs.script_dir || '')
    .replaceAll('{dataDir}', dirs.aviutl2_data || '')
    .replaceAll('{download}', ctx.downloadPath || '');
}

// インストーラ処理用の一時作業ディレクトリの作成
// インストーラ処理用の一時作業ディレクトリの作成
async function ensureTmpDir(idVersion) {
  const fs = await import('@tauri-apps/plugin-fs');
  const path = await import('@tauri-apps/api/path');
  const base = 'installer-tmp';

  // ベースディレクトリ作成
  await fs.mkdir(base, { baseDir: fs.BaseDirectory.AppConfig, recursive: true });

  // サブディレクトリ作成
  const sub = `${base}/${idVersion}`;
  await fs.mkdir(sub, { baseDir: fs.BaseDirectory.AppConfig, recursive: true });

  // 絶対パス取得
  const basePath = await path.appConfigDir(); // AppConfig の絶対パス
  const absPath = await path.join(basePath, sub); // 絶対パスを連結

  return absPath;
}

// -------------------------
// exe実行処理
// -------------------------

function psEscape(s) {
  return String(s).replace(/'/g, "''");
}

// 実行ファイルをウィンドウ非表示で実行する関数
async function runInstaller(exeAbsPath, args = [], elevate = false, tmpPath) {
  const shell = await import('@tauri-apps/plugin-shell');
  const fs = await import('@tauri-apps/plugin-fs');
  const argList = (args || []).map((a) => `'${psEscape(a)}'`).join(', ');
  const argClause = args && args.length > 0 ? ` -ArgumentList @(${argList})` : '';
  const body = [
    "$ErrorActionPreference='Stop'",
    '[Console]::OutputEncoding=[System.Text.UTF8Encoding]::new()',
    `$p = Start-Process -FilePath '${exeAbsPath}'${argClause}${elevate ? ' -Verb RunAs' : ''} -WindowStyle Hidden -Wait -PassThru`,
    'exit ($p.ExitCode)',
  ].join('; ');
  const scriptName = `run-${Date.now()}.ps1`;
  const scriptRel = `${tmpPath.replace(/\\/g, '/')}/${scriptName}`;
  await fs.writeTextFile(scriptRel, body);
  const argsPs = ['-ExecutionPolicy', 'Bypass', '-NoLogo', '-NoProfile', '-NonInteractive', '-File', scriptRel];
  const cmd = shell.Command.create('powershell', argsPs, { encoding: 'utf-8' });
  const res = await cmd.execute();
  if (res.code !== 0) {
    throw new Error(
      `runExecutableQuietWindows failed (exe=${exeAbsPath}, args=${JSON.stringify(args)}, elevate=${!!elevate}) exit=${res.code}, stderr=${(res.stderr || '').slice(0, 500)}`,
    );
  }
}

async function runAuoSetup(exeAbsPath) {
  try {
    const { invoke } = await import('@tauri-apps/api/core');
    const _result = await invoke('run_auo_setup', { exePath: exeAbsPath });
  } catch (e) {
    logError(`[runAuoSetup] failed exe=${exeAbsPath}: ${e}`);
    throw e; // ← 呼び出し元に Rust のエラーを投げる
  }
}

// インストーラーからダウンロードURLを生成
// GitHub最新リリースのダウンロードURLを取得
async function fetchGitHubURL(github) {
  const http = await import('@tauri-apps/plugin-http');
  const { owner, repo, pattern } = github;
  const regex = pattern ? new RegExp(pattern) : null;

  // リリースから対象アセットを選ぶ
  const pickAssetFromRelease = (release) => {
    if (!release || !Array.isArray(release.assets)) return null;
    if (regex) {
      const matched = release.assets.find((a) => regex.test(a.name || ''));
      if (matched) return matched;
    }
    return release.assets[0] || null;
  };

  // release一覧を走査し「最終更新日時が最も新しいアセット」を返す
  const findLatestUpdatedAsset = (releases) => {
    if (!Array.isArray(releases) || !releases.length) return null;
    let best = null;
    let bestTs = -Infinity;
    for (const rel of releases) {
      const assets = Array.isArray(rel?.assets) ? rel.assets : [];
      for (const asset of assets) {
        if (regex && !regex.test(asset?.name || '')) continue;
        // asset.updated_at/created_at、なければ release の日付を比較
        const ts =
          Date.parse(asset?.updated_at || asset?.created_at || rel?.published_at || rel?.created_at || '') || 0;
        if (ts > bestTs) {
          best = asset;
          bestTs = ts;
        }
      }
    }
    return best;
  };

  try {
    // latest API から取得を試みる
    const res = await http.fetch(`https://api.github.com/repos/${owner}/${repo}/releases/latest`);
    const data = await res.json().catch(() => ({}));
    const asset = pickAssetFromRelease(data);
    if (asset?.browser_download_url) {
      return asset.browser_download_url;
    }
  } catch (e) {
    try {
      await logError(`[fetchGitHubAsset] fetch latest failed: ${e?.message || e}`);
    } catch {}
  }

  try {
    // latest が無い場合は release 一覧から最終更新のアセットを選ぶ
    const res = await http.fetch(`https://api.github.com/repos/${owner}/${repo}/releases?per_page=30`);
    const list = await res.json().catch(() => []);
    const asset = findLatestUpdatedAsset(list);
    return asset?.browser_download_url || '';
  } catch (e) {
    try {
      await logError(`[fetchGitHubAsset] fetch failed: ${e?.message || e}`);
    } catch {}
    return '';
  }
}

// 絶対パスかどうかを判定
function isAbsPath(p) {
  return /^(?:[a-zA-Z]:[\\/]|\\\\|\/)/.test(String(p || ''));
}

async function deletePath(absPath) {
  const fs = await import('@tauri-apps/plugin-fs');
  let ok = false;
  let lastErr = null;
  try {
    // 存在確認
    const exists = await fs.exists(absPath);
    if (!exists) {
      return false; // 存在しない場合
    }
    // 削除を試みる（ディレクトリも含め再帰的に）
    try {
      await fs.remove(absPath, { recursive: true });
      ok = true;
    } catch {
      // 一度失敗したら stat で種類を確認して削除をやり直す
      try {
        const st = await fs.stat(absPath);
        if (st.isDirectory) {
          await fs.remove(absPath, { recursive: true });
        } else {
          await fs.remove(absPath);
        }
        ok = true;
      } catch (e) {
        lastErr = e;
      }
    }
    if (ok) return true;
  } catch (e) {
    lastErr = e;
  }
  // 削除できなかった場合はエラーを投げる
  if (!ok) throw lastErr || new Error('remove failed');
  return ok;
}

// ファイルのダウンロード（Rust経由）
export async function downloadFileFromUrl(url, destPath, options = {}) {
  if (!/^https:\/\//i.test(url)) throw new Error(`Only https:// is allowed (got: ${url})`);
  if (typeof destPath !== 'string' || !destPath.trim()) throw new Error('destPath must be an existing directory');

  const { invoke } = await import('@tauri-apps/api/core');
  const { listen } = await import('@tauri-apps/api/event');

  const onProgress = typeof options.onProgress === 'function' ? options.onProgress : null;
  const taskId =
    options.taskId ||
    (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
      ? crypto.randomUUID()
      : `dl-${Date.now()}-${Math.random().toString(16).slice(2)}`);

  const unlisteners = [];
  const registerListener = async (eventName, handler) => {
    const unlisten = await listen(eventName, (evt) => {
      const payload = evt?.payload;
      if (!payload || payload.taskId !== taskId) return;
      handler(payload);
    });
    unlisteners.push(unlisten);
  };

  if (onProgress) {
    await registerListener('download:progress', (payload) => {
      const read = typeof payload.read === 'number' ? payload.read : 0;
      const total = typeof payload.total === 'number' ? payload.total : null;
      onProgress({ read, total });
    });
  }

  try {
    const finalPath = await invoke('download_file_to_path', { url, destPath, taskId });
    return finalPath;
  } catch (e) {
    const detail = e?.message || (typeof e === 'object' ? JSON.stringify(e) : String(e)) || 'unknown error';
    throw new Error(`downloadFileFromUrl failed (url=${url}): ${detail}`, { cause: e });
  } finally {
    for (const unlisten of unlisteners) {
      try {
        unlisten();
      } catch {}
    }
  }
}

// -------------------------
// BOOTH認証ウィンドウ管理・ダウンロード
// -------------------------
// BOOTH認証ウィンドウのラベルとイベント名
const BOOTH_AUTH_WINDOW_LABEL = 'booth-auth';
const BOOTH_LOGIN_COMPLETE_EVENT = 'booth-auth:login-complete';
// 認証ウィンドウの作成
async function ensureBoothAuthWindow() {
  const { invoke } = await import('@tauri-apps/api/core');
  await invoke('ensure_booth_auth_window');
}
// 認証ウィンドウを閉じる
async function closeBoothAuthWindow() {
  try {
    const { invoke } = await import('@tauri-apps/api/core');
    await invoke('close_booth_auth_window');
  } catch {}
}
// 認証完了イベントを待機
async function prepareBoothLoginWait() {
  const { listen } = await import('@tauri-apps/api/event');
  let resolveFn;
  // 1回だけ解決するPromiseを作る
  const done = new Promise((resolve) => {
    resolveFn = resolve;
  });
  const unlisten = await listen(BOOTH_LOGIN_COMPLETE_EVENT, (evt) => {
    try {
      unlisten();
    } catch {}
    resolveFn(evt?.payload);
  });
  return done;
}

// BOOTH 直リンク用ダウンロード（Rust経由 + Cookie）
// ファイルのダウンロード（BOOTHから）
export async function downloadFileFromBoothUrl(url, destPath, options = {}) {
  const { invoke } = await import('@tauri-apps/api/core');
  const { listen } = await import('@tauri-apps/api/event');

  const onProgress = typeof options.onProgress === 'function' ? options.onProgress : null;
  // タスクIDを決定
  const taskId =
    options.taskId ||
    (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
      ? crypto.randomUUID()
      : `dl-${Date.now()}-${Math.random().toString(16).slice(2)}`);

  const unlisteners = [];
  const registerListener = async (eventName, handler) => {
    const unlisten = await listen(eventName, (evt) => {
      const payload = evt?.payload;
      if (!payload || payload.taskId !== taskId) return;
      handler(payload);
    });
    unlisteners.push(unlisten);
  };

  if (onProgress) {
    await registerListener('download:progress', (payload) => {
      const read = typeof payload.read === 'number' ? payload.read : 0;
      const total = typeof payload.total === 'number' ? payload.total : null;
      onProgress({ read, total });
    });
  }

  // Rust側のBOOTHダウンロードを呼び出す
  const invokeDownload = () =>
    invoke('download_file_to_path_booth', {
      url,
      destPath,
      taskId,
      sessionWindowLabel: BOOTH_AUTH_WINDOW_LABEL,
    });

  try {
    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        const finalPath = await invokeDownload();
        return finalPath;
      } catch (e) {
        const detail = e?.message || (typeof e === 'object' ? JSON.stringify(e) : String(e)) || 'unknown error';
        const needsAuth = detail.includes('AUTH_REQUIRED') || detail.includes('AUTH_WINDOW_MISSING');
        if (needsAuth && attempt === 0) {
          // 未ログイン時のみ、ログイン完了イベントを待って再試行
          const waitLogin = prepareBoothLoginWait();
          await ensureBoothAuthWindow();
          await waitLogin;
          continue;
        }
        throw new Error(`downloadFileFromBoothUrl failed (url=${url}): ${detail}`, { cause: e });
      }
    }
    throw new Error(`downloadFileFromBoothUrl failed (url=${url}): AUTH_REQUIRED`);
  } finally {
    for (const unlisten of unlisteners) {
      try {
        unlisten();
      } catch {}
    }
  }
}

// ZIPファイルを展開（Rust）
async function extractZip(zipPath, destPath) {
  try {
    const { invoke } = await import('@tauri-apps/api/core');
    await invoke('extract_zip', { zipPath, destPath });
    return;
  } catch (e) {
    try {
      await logError(`[extractZip] failed: ${e?.message || e}`);
    } catch {}
  }
}

// 7-Zip SFX (self extractor) のデータを展開 (Rust)
async function extractSevenZipSfx(sfxPath, destPath) {
  try {
    const { invoke } = await import('@tauri-apps/api/core');
    // const base = (!isAbsPath(sfxPath) && !isAbsPath(destPath)) ? 'AppConfig' : null;
    await invoke('extract_7z_sfx', { sfxPath, destPath });
    return;
  } catch (e) {
    try {
      await logError(`[extractSevenZipSfx] failed: ${e?.message || e}`);
    } catch {}
  }
}

// ファイルのコピー処理関数(Rust)
async function copyPattern(fromPattern, toDirRel) {
  const { invoke } = await import('@tauri-apps/api/core');
  return await invoke('copy_item_js', { srcStr: fromPattern, dstStr: toDirRel });
}

// インストーラの存在を判定
export function hasInstaller(item) {
  // 文字列ショートハンド形式の installer も有効とみなす
  return !!(item && item.installer && (typeof item.installer === 'string' || Array.isArray(item.installer.install)));
}

// -------------------------
// インストーラー&アンインストーラーの実行
// -------------------------

const STEP_PROGRESS_LABELS = {
  download: 'ダウンロード中',
  extract: '展開中',
  extract_sfx: '展開中',
  copy: 'コピー中',
  run: '実行中',
  run_auo_setup: '実行中',
};

const STEP_PROGRESS_OFFSET = 0;

// インストールの実行
export async function runInstallerForItem(item, dispatch, onProgress) {
  await ensureAviutlClosed();
  // 実行用コンテキストを構築
  const version = item['latest-version'];
  // logInfo(`item=${JSON.stringify(item)}, version=${version}`);
  const idVersion = `${item.id}-${version || 'latest'}`.replace(/[^A-Za-z0-9._-]/g, '_');
  const tmpDir = await ensureTmpDir(idVersion);

  const ctx = {
    tmpDir: tmpDir,
    downloadPath: '', // ダウンロードしたときに設定
  };
  const steps = Array.isArray(item?.installer?.install) ? item.installer.install : [];
  const totalSteps = steps.length;

  const buildProgressPayload = (completedUnits, step, index, phase) => {
    const safeUnits = Number.isFinite(completedUnits) ? completedUnits : 0;
    const ratio = totalSteps <= 0 ? (phase === 'done' ? 1 : 0) : Math.min(1, Math.max(0, safeUnits / totalSteps));
    const label = (() => {
      if (phase === 'done') return '完了';
      if (phase === 'init') return '準備中…';
      if (phase === 'error') return 'エラーが発生しました';
      const action = step?.action;
      return STEP_PROGRESS_LABELS[action] || '処理中…';
    })();
    return {
      ratio,
      percent: Math.round(ratio * 100),
      step: step?.action ?? null,
      stepIndex: Number.isInteger(index) && index >= 0 ? index : null,
      totalSteps,
      label,
      phase,
    };
  };

  const emitProgress = (completedUnits, step, index, phase) => {
    if (typeof onProgress !== 'function') return;
    try {
      onProgress(buildProgressPayload(completedUnits, step, index, phase));
    } catch {
      // UI 側の例外は握り潰す
    }
  };

  emitProgress(0, null, -1, 'init');

  try {
    await logInfo(`[installer ${item.id}] start version=${version || ''} steps=${steps.length}`);
    for (let idx = 0; idx < steps.length; idx++) {
      const step = steps[idx];
      const runningUnits = idx;
      emitProgress(runningUnits, step, idx, 'running');
      try {
        switch (step.action) {
          case 'download': {
            const src = item?.installer?.source;
            if (!src) throw new Error(`Download source is not specified`);
            // 1. Google Drive ダウンロード
            if (src.GoogleDrive && typeof src.GoogleDrive.id === 'string' && src.GoogleDrive.id) {
              const fileId = src.GoogleDrive.id;
              const stepSpan = 1 - STEP_PROGRESS_OFFSET;
              const startUnits = runningUnits;
              const maxUnits = idx + 1 - 0.01;
              let unknownUnits = startUnits;
              const unlisteners = [];
              if (typeof onProgress === 'function') {
                const { listen } = await import('@tauri-apps/api/event');
                const register = async (eventName, handler) => {
                  const unlisten = await listen(eventName, (evt) => {
                    const payload = evt?.payload;
                    if (!payload || payload.fileId !== fileId) return;
                    handler(payload);
                  });
                  unlisteners.push(unlisten);
                };
                await register('drive:progress', (payload) => {
                  const read = typeof payload.read === 'number' ? payload.read : 0;
                  const total = typeof payload.total === 'number' ? payload.total : null;
                  if (typeof total === 'number' && total > 0) {
                    const ratio = Math.min(1, Math.max(0, total ? read / total : 0));
                    const units = startUnits + stepSpan * ratio;
                    emitProgress(units, step, idx, 'running');
                  } else if (typeof read === 'number' && read > 0) {
                    const increment = stepSpan * 0.05;
                    unknownUnits = Math.min(maxUnits, unknownUnits + increment);
                    emitProgress(unknownUnits, step, idx, 'running');
                  }
                });
              }
              try {
                const { invoke } = await import('@tauri-apps/api/core');
                await invoke('drive_download_to_file', { fileId, destPath: tmpDir });
              } finally {
                for (const unlisten of unlisteners) {
                  try {
                    unlisten();
                  } catch {}
                }
              }
              ctx.downloadPath = tmpDir;
              logInfo(`[installer ${item.id}] downloading from Google Drive fileId=${src.GoogleDrive.id} to ${tmpDir}`);
              break;
            }
            // 2. BOOTH 直リンクの場合
            if (typeof src.booth === 'string' && src.booth) {
              const boothUrl = src.booth;
              logInfo(`[installer ${item.id}] downloading from BOOTH ${boothUrl} to ${tmpDir}`);
              const stepSpan = 1 - STEP_PROGRESS_OFFSET;
              const startUnits = runningUnits;
              const maxUnits = idx + 1 - 0.01;
              let unknownUnits = startUnits;
              ctx.downloadPath = await downloadFileFromBoothUrl(boothUrl, tmpDir, {
                onProgress: ({ read, total }) => {
                  if (typeof total === 'number' && total > 0) {
                    const ratio = Math.min(1, Math.max(0, total ? read / total : 0));
                    const units = startUnits + stepSpan * ratio;
                    emitProgress(units, step, idx, 'running');
                  } else if (typeof read === 'number' && read > 0) {
                    const increment = stepSpan * 0.05;
                    unknownUnits = Math.min(maxUnits, unknownUnits + increment);
                    emitProgress(unknownUnits, step, idx, 'running');
                  }
                },
              });
              break;
            }
            let url = '';
            // 3. GitHubの場合
            if (src.github && src.github.owner && src.github.repo) {
              url = await fetchGitHubURL(src.github);
            }
            // 4. 直接URLの場合
            if (typeof src.direct === 'string' && src.direct) {
              url = src.direct;
            }
            if (!url) throw new Error('Download source is not specified');
            logInfo(`[installer ${item.id}] downloading from ${url} to ${tmpDir}`);
            const stepSpan = 1 - STEP_PROGRESS_OFFSET;
            const startUnits = runningUnits;
            const maxUnits = idx + 1 - 0.01;
            let unknownUnits = startUnits;
            ctx.downloadPath = await downloadFileFromUrl(url, tmpDir, {
              onProgress: ({ read, total }) => {
                if (typeof total === 'number' && total > 0) {
                  const ratio = Math.min(1, Math.max(0, total ? read / total : 0));
                  const units = startUnits + stepSpan * ratio;
                  emitProgress(units, step, idx, 'running');
                } else if (typeof read === 'number' && read > 0) {
                  const increment = stepSpan * 0.05;
                  unknownUnits = Math.min(maxUnits, unknownUnits + increment);
                  emitProgress(unknownUnits, step, idx, 'running');
                }
              },
            });
            break;
          }
          case 'extract': {
            const fromRel = await expandMacros(step.from || ctx.downloadPath, ctx);
            const toRel = await expandMacros(step.to || `{tmp}`, ctx);
            logInfo(`[installer ${item.id}] extracting from ${fromRel} to ${toRel}`);
            await extractZip(fromRel, toRel);
            break;
          }
          case 'extract_sfx': {
            const fromRel = await expandMacros(step.from || ctx.downloadPath, ctx);
            const toRel = await expandMacros(step.to || `{tmp}`, ctx);
            logInfo(`[installer ${item.id}] extracting SFX from ${fromRel} to ${toRel}`);
            await extractSevenZipSfx(fromRel, toRel);
            break;
          }
          case 'copy': {
            const from = await expandMacros(step.from, ctx);
            const to = await expandMacros(step.to, ctx);
            const count = await copyPattern(from, to);
            logInfo(`[installer ${item.id}] copy matched ${count} files (from=${from} to=${to})`);
            if (count === 0) {
              throw new Error(`copy matched 0 files (from=${from} to=${to})`);
            }
            break;
          }
          // aviutl2本体のインストールを対象
          case 'run': {
            const pRaw = await expandMacros(step.path, ctx);
            const args = await Promise.all((step.args || []).map((a) => expandMacros(String(a), ctx)));
            await runInstaller(pRaw, args, !!step.elevate, ctx.tmpDir);
            break;
          }
          case 'run_auo_setup': {
            const pRaw = await expandMacros(step.path, ctx);
            await runAuoSetup(pRaw);
            break;
          }
          default:
            throw new Error(`unsupported action: ${String(step.action)}`);
        }
        emitProgress(idx + 1, step, idx, 'step-complete');
      } catch (e) {
        emitProgress(runningUnits, step, idx, 'error');
        const err = e instanceof Error ? e : new Error(String(e));
        const prefix = `[installer ${item.id}] step ${idx + 1}/${steps.length} action=${step.action} failed`;
        try {
          await logError(`${prefix}:\n${err.message}\n${err.stack ?? '(no stack)'}`);
        } catch {}
        throw new Error(`${prefix}: ${err.message}`, { cause: e });
      }
    }

    // インストール済みとして記録し、最新判定のために検出結果を更新
    await addInstalledId(item.id, version);
    if (dispatch) {
      const map = await detectInstalledVersionsMap([item]);
      const detected = String((map && map[item.id]) || '');
      dispatch({ type: 'SET_DETECTED_ONE', payload: { id: item.id, version: detected } });
    }
    try {
      await recordPackageStateEvent('install', item.id);
    } catch {}
    await logInfo(`[installer ${item.id}] completed version=${version || ''}`);
    emitProgress(totalSteps, null, null, 'done');
    // 後始末: 一時作業フォルダを削除（成功時のみ）
    if (!import.meta.env?.DEV) {
      try {
        const fs = await import('@tauri-apps/plugin-fs');
        await fs.remove('installer-tmp', { baseDir: fs.BaseDirectory.AppConfig, recursive: true });
      } catch {}
    }
  } catch (e) {
    const detail = (e && (e.message || (typeof e === 'object' ? JSON.stringify(e) : String(e)))) || 'unknown error';
    try {
      await logError(`[installer ${item.id}] error: ${detail}`);
    } catch {}
    throw e;
  } finally {
    await closeBoothAuthWindow();
  }
}

// アンインストールを実行
export async function runUninstallerForItem(item, dispatch) {
  await ensureAviutlClosed();
  const version = item['latest-version'];
  const idVersion = `${item.id}-${version || 'latest'}`.replace(/[^A-Za-z0-9._-]/g, '_');
  const tmpDir = await ensureTmpDir(idVersion);
  const ctx = {
    tmpDir: tmpDir,
    downloadPath: '',
  };

  try {
    await logInfo(`[uninstall ${item.id}] start steps=${item.installer.uninstall.length}`);
    // アンインストール手順を順に実行
    for (let i = 0; i < item.installer.uninstall.length; i++) {
      const step = item.installer.uninstall[i];
      try {
        switch (step.action) {
          case 'delete': {
            const p = await expandMacros(step.path, ctx);
            try {
              const abs = isAbsPath(p) ? p : p; // アンインストールのパスは原則絶対パス。相対ならそのまま扱う
              const ok = await deletePath(abs);
              if (ok) await logInfo(`[uninstall ${item.id}] delete ok path="${p}"`);
              else await logInfo(`[uninstall ${item.id}] delete skip (not found) path="${p}"`);
            } catch (e) {
              throw new Error(`delete failed path=${p}: ${e?.message || e}`, { cause: e });
            }
            break;
          }
          case 'run': {
            const pRaw = await expandMacros(step.path, ctx);
            const args = await Promise.all((step.args || []).map((a) => expandMacros(String(a), ctx)));
            await runInstaller(pRaw, args, !!step.elevate, ctx.tmpDir);
            break;
          }
          default:
            await logInfo(`[uninstall ${item.id}] skip unsupported action=${String(step.action)}`);
            break;
        }
      } catch (e) {
        const msg = `[uninstall ${item.id}] step ${i + 1}/${item.installer.uninstall.length} action=${step.action} failed: ${e?.message || e}`;
        try {
          await logError(msg);
        } catch {}
        throw new Error(msg, { cause: e });
      }
    }
  } catch (e) {
    const detail = e?.message || e;
    try {
      await logError(`[uninstall ${item.id}] error: ${detail}`);
    } catch {}
    throw e;
  }

  await removeInstalledId(item.id);
  if (dispatch) {
    // 状態の正確さを保つため再検出
    const map = await detectInstalledVersionsMap([item]);
    const detected = String((map && map[item.id]) || '');
    dispatch({ type: 'SET_DETECTED_ONE', payload: { id: item.id, version: detected } });
  }
  try {
    await recordPackageStateEvent('uninstall', item.id);
  } catch {}
  await logInfo(`[uninstall ${item.id}] completed`);
}
