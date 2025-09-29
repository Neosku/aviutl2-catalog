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
  s = s.replace(/[！-～]/g, ch => String.fromCharCode(ch.charCodeAt(0) - 0xFEE0));
  // 全角スペースを半角スペースに変換
  s = s.replace(/　/g, ' ');
  // カタカナをひらがなに変換
  s = s.replace(/[ァ-ヶ]/g, ch => String.fromCharCode(ch.charCodeAt(0) - 0x60));
  return s;
}

// 名前を昇順で比較する関数
// aの名前がbの名前より辞書順で後の時1、前の時-1、同じ時0を返す
function cmpNameAsc(a, b) {
  const x = a.nameKey || '';
  const y = b.nameKey || '';
  return x < y ? -1 : (x > y ? 1 : 0);
}

// タイムスタンプから "YYYY-MM-DD" の形式に変換する関数
// 無効な値(null, undefined, NaNなど)や不正な日付は空文字列を返す
// 必要か要件等
export function formatDate(ts) {
  if (ts == null) return '';
  const d = new Date(ts);
  if (isNaN(+d)) return '';
  const pad2 = n => ('0' + n).slice(-2);       // 2桁ゼロ埋めの簡易関数
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
  return terms.every(t => keys.some(k => k.includes(t)));
}

// 絞り込みを行う関数
// 種類とタグでの絞り込みを行う
// JavaScript側での実装を維持（高速化は将来的にRust側で実装）
export function filterByTagsAndType(items, tags = [], types = []) {
  return items.filter(it => {
    const tagOk = !tags?.length || (it.tags || []).some(t => tags.includes(t));
    const typeOk = !types?.length || types.includes(it.type);
    return tagOk && typeOk;
  });
}

// ソート基準と方向に応じて比較結果を返す関数
// key='name'なら名前の昇順/降順で比較、key='newest'なら更新日時の昇順(古い順)/降順(新しい順)で比較
// updatedAtがnullのものは常に末尾に回し、同値の場合は名前順で判定する
export function getSorter(key = 'newest', dir = 'desc') {
  if (key === 'name') {
    if (dir === 'desc') return (a, b) => -cmpNameAsc(a, b);
    return cmpNameAsc;
  }
  if (dir === 'asc') {
    return (a, b) => {
      const d = ((a.updatedAt == null ? Number.POSITIVE_INFINITY : a.updatedAt) -
        (b.updatedAt == null ? Number.POSITIVE_INFINITY : b.updatedAt));
      return d || cmpNameAsc(a, b);
    };
  }
  return (a, b) => {
    const d = ((b.updatedAt == null ? Number.NEGATIVE_INFINITY : b.updatedAt) -
      (a.updatedAt == null ? Number.NEGATIVE_INFINITY : a.updatedAt));
    return d || cmpNameAsc(a, b);
  };
}


// -------------------------
// インストール状態の記録
// -------------------------

// インストールされているプラグインのIDとバージョンをjsonに保存
// スキーマ: { [id: string]: string /* version */ }
const INSTALLED_FILE = 'installed.json';

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
    console.error('Failed to write installed map:', e);
    try { await logError(`[writeInstalledMap] failed: ${e?.message || e}`); } catch (_) { }
  }
  return map;
}

// installed.jsonにIDとバージョンを追加
async function addInstalledId(id, version = '') {
  try {
    const { invoke } = await import('@tauri-apps/api/core');
    await invoke('add_installed_id_cmd', { id, version: String(version || '') });
  } catch (e) {
    try { await logError(`[addInstalledId] invoke failed, fallback to file: ${e?.message || e}`); } catch (_) { }
  }
}

// installed.jsonから指定IDを削除
export async function removeInstalledId(id) {
  try {
    const { invoke } = await import('@tauri-apps/api/core');
    await invoke('remove_installed_id_cmd', { id });
  } catch (e) {
    try { await logError(`[removeInstalledId] invoke failed, fallback to file: ${e?.message || e}`); } catch (_) { }
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
  const arr = Array.isArray(item.versions) ? item.versions : (Array.isArray(item.version) ? item.version : []);
  if (!arr.length) return '';
  const last = arr[arr.length - 1];
  return last?.version || '';
}

// -------------------------
// settings.jsonの読み書き
// -------------------------


// 設定の永続化（AviUtl2 ルートと主要サブディレクトリなど）
const SETTINGS_FILE = 'settings.json';

// settings.jsonに保存されている設定を読み込み
// とりあえずJavaScript側で実装（Rust実装は未定）
async function readSettings() {
  const fs = await import('@tauri-apps/plugin-fs');
  try {
    const exists = await fs.exists(SETTINGS_FILE, { baseDir: fs.BaseDirectory.AppConfig });
    if (!exists) return {};
    const raw = await fs.readTextFile(SETTINGS_FILE, { baseDir: fs.BaseDirectory.AppConfig });
    const data = JSON.parse(raw || '{}');
    return (data && typeof data === 'object') ? data : {};
  } catch (e) { try { await logError(`[readSettings] failed: ${e?.message || e}`); } catch (_) { } return {}; }
}

// 設定をsettings.jsonに保存
// よく使うものでもないのでJavaScriptで実装
// ブラウザ版はlocalstorageなどに保存するのがベスト
async function writeSettings(map) {
  const fs = await import('@tauri-apps/plugin-fs');
  await fs.writeTextFile(SETTINGS_FILE, JSON.stringify(map, null, 2), { baseDir: fs.BaseDirectory.AppConfig });
  return map;
}

// UI から利用するエクスポート関数
// settings.jsonに保存されている設定を読み込み
export async function getSettings() { return await readSettings(); }

// setting.jsonの設定を上書き
// UpdateChecker を pluginsDir 変更時に移動
async function moveUpdateCheckerIfNeeded(oldDir, newDir) {
  try {
    const fs = await import('@tauri-apps/plugin-fs');
    if (!oldDir || !newDir || oldDir === newDir) return false;
    const toWin = (p) => String(p || '').replace(/\//g, '\\').replace(/[\\]+$/, '');
    const src = toWin(`${oldDir}\\UpdateChecker.aui2`);
    const dstDir = toWin(newDir);
    const dst = toWin(`${newDir}\\UpdateChecker.aui2`);
    const exists = await fs.exists(src);
    if (!exists) return false;
    try { await fs.mkdir(dstDir, { recursive: true }); } catch (_) { }
    const buf = await fs.readFile(src);
    await fs.writeFile(dst, buf);
    try { await fs.remove(src); } catch (_) { }
    try { await logInfo(`[settings] moved UpdateChecker.aui2: ${src} -> ${dst}`); } catch (_) { }
    return true;
  } catch (e) {
    try { await logError(`[settings] moveUpdateCheckerIfNeeded failed: ${e?.message || e}`); } catch (_) { }
    return false;
  }
}

export async function setSettings(partial) {
  const cur = await readSettings();
  const next = { ...cur, ...partial };
  // テーマ名のマイグレーション（noir -> darkmode）
  if (next.theme === 'noir') next.theme = 'darkmode';
  if (!next.theme) next.theme = 'darkmode';
  // pluginsDir が変更されたら UpdateChecker.aui2 を移動
  try {
    const oldDir = String(cur.pluginsDir || '').trim();
    const newDir = String(next.pluginsDir || '').trim();
    if (oldDir && newDir && oldDir !== newDir) {
      await moveUpdateCheckerIfNeeded(oldDir, newDir);
    }
  } catch (e) { try { await logError(`[settings] pluginsDir move hook failed: ${e?.message || e}`); } catch (_) { } }
  return await writeSettings(next);
}

// -------------------------
// ログ出力　OK
// -------------------------

// ログを出力する
export function logInfo(msg) { return logLine('INFO', msg); }
export function logError(msg) { return logLine('ERROR', msg); }

// Rust側の log_cmd を呼び出す
async function logLine(level, msg) {
  try {
    const { invoke } = await import('@tauri-apps/api/core');
    await invoke('log_cmd', { level: String(level), msg: String(msg) });
  } catch (_) { }
}

// -------------------------
// 診断（OS/GPU/インストール済みアプリ、app.log）
// 診断時のみ実行するためこのままでOK（後回し）
// -------------------------

const LOG_FILE = 'logs/app.log';

// OS/CPU/GPU/プラグインなどの環境情報を収集
export async function collectDeviceInfo() {
  const info = { os: {}, cpu: {}, gpu: {}, installedApps: [], installedPlugins: [] };
  const isWin = true; const isMac = false; const isLinux = false;

  // OS情報を取得
  try {
    const shell = await import('@tauri-apps/plugin-shell');
    const ps = shell.Command.create('powershell', [
      '-NoLogo', '-NoProfile', '-NonInteractive', '-ExecutionPolicy', 'Bypass', '-Command',
      "(Get-CimInstance -ClassName Win32_OperatingSystem | Select-Object -First 1 @{N='Platform';E={'Windows'}}, @{N='Version';E={$_.Version}}, @{N='Arch';E={$env:PROCESSOR_ARCHITECTURE}}) | ConvertTo-Json -Compress"
    ]);
    const out = await ps.execute();
    if (out.code === 0 && out.stdout) {
      try { const obj = JSON.parse(out.stdout); info.os = { name: obj.Platform || 'Windows', version: obj.Version || '', arch: obj.Arch || '' }; }
      catch { info.os = { name: 'Windows', version: '', arch: '' }; }
    } else { info.os = { name: 'Windows', version: '', arch: '' }; }
  } catch (e) { try { await logError(`[collectDeviceInfo] OS query failed: ${e?.message || e}`); } catch (_) { } }

  // CPU情報を取得
  try {
    const shell = await import('@tauri-apps/plugin-shell');
    const ps = shell.Command.create('powershell', [
      '-NoLogo', '-NoProfile', '-NonInteractive', '-ExecutionPolicy', 'Bypass', '-Command',
      "(Get-CimInstance Win32_Processor | Select-Object -First 1 Name, Manufacturer, MaxClockSpeed, NumberOfCores, NumberOfLogicalProcessors, ProcessorId) | ConvertTo-Json -Compress"
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

  } catch (e) { try { await logError(`[collectDeviceInfo] CPU query failed: ${e?.message || e}`); } catch (_) { } }

  // GPU情報を取得
  const shell = await import('@tauri-apps/plugin-shell');
  const ps = shell.Command.create('powershell', [
    '-NoLogo', '-NoProfile', '-NonInteractive', '-ExecutionPolicy', 'Bypass', '-Command',
    "$ErrorActionPreference='SilentlyContinue'; $g=Get-CimInstance Win32_VideoController | Select-Object Name, AdapterCompatibility, DriverVersion, DriverDate, VideoProcessor, AdapterRAM | Sort-Object AdapterRAM -Descending | ConvertTo-Json -Compress; $g"
  ]);
  const out = await ps.execute();
  if (out.code === 0 && out.stdout) {
    let arr = [];
    try { arr = JSON.parse(out.stdout); } catch { arr = []; }
    const list = Array.isArray(arr) ? arr : (arr ? [arr] : []);
    const nonBasic = list.filter(x => (x?.Name || '').toLowerCase().indexOf('microsoft basic render') === -1);
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
  } catch (e) { try { await logError(`[readAppLog] failed: ${e?.message || e}`); } catch (_) { } return ''; }
}

// -------------------------
// ハッシュ計算・インストール済みバージョン検出
// -------------------------

// 指定パッケージのインストール済みバージョンを検出（Rust実装を使用）
export async function detectInstalledVersionsMap(items) {
  const list = Array.isArray(items) ? items : [];
  const { invoke } = await import('@tauri-apps/api/core');
  const res = await invoke('detect_versions_map', { items: list });
  return (res && typeof res === 'object') ? res : {};
}

// 設定に必要なパス（フォルダ）を初期化・作成
async function ensurePaths(requiredKeys = []) {
  const dialog = await import('@tauri-apps/plugin-dialog');
  const fs = await import('@tauri-apps/plugin-fs');
  let settings = await readSettings();
  let changed = false;

  // 既定の初期設定（Windows のパス）
  const defaultPaths = {
    appDir: 'C:\\Program Files\\AviUtl2',
    pluginsDir: 'C:\\ProgramData\\aviutl2\\Plugin',
    scriptsDir: 'C:\\ProgramData\\aviutl2\\Script'
  };

  // ディレクトリ選択ダイアログを表示する関数
  async function askDir(title) {
    const p = await dialog.open({ directory: true, multiple: false, title });
    if (!p) throw new Error('ユーザーがディレクトリ選択をキャンセルしました');
    return String(p);
  }

  for (const key of requiredKeys) {
    if (settings[key]) {
      // 既に設定がある場合はそのまま使う
    } else {
      if (defaultPaths[key]) {
        // 初回のみプロンプトなしで既定値を適用
        settings[key] = defaultPaths[key];
        changed = true;
      }
    }
    // 存在を確保（絶対パス）
    try { await fs.mkdir(settings[key], { recursive: true }); } catch (_) { /* ignore */ }
  }
  if (changed) await writeSettings(settings);
  return settings;
}


// 文字列内のマクロに実際の値を埋め込み
function expandMacros(s, ctx) {
  if (typeof s !== 'string') return s;
  return s
    .replaceAll('{tmp}', ctx.tmpDir)
    .replaceAll('{appDir}', ctx.appDir || '')
    .replaceAll('{pluginsDir}', ctx.pluginsDir || '')
    .replaceAll('{scriptsDir}', ctx.scriptsDir || '')
    .replaceAll('{id}', ctx.id || '')
    .replaceAll('{version}', ctx.version || '')
    .replaceAll('{download}', ctx.downloadPath || '')
    .replaceAll('{PRODUCT_CODE}', ctx.productCode || '');
}

// インストーラ処理用の一時作業ディレクトリの作成
async function ensureTmpDir(idVersion) {
  const fs = await import('@tauri-apps/plugin-fs');
  const base = 'installer-tmp';
  await fs.mkdir(base, { baseDir: fs.BaseDirectory.AppConfig, recursive: true });
  const sub = `${base}/${idVersion}`;
  await fs.mkdir(sub, { baseDir: fs.BaseDirectory.AppConfig, recursive: true });
  return {
    baseDir: fs.BaseDirectory.AppConfig,
    rel: sub,
    abs: sub,
  };
}

// ダウンロードURLからファイル名を決定
function fileNameFromUrl(url) {
  try {
    if (typeof url === 'string') {
      // Google Drive 仮想スキームや非HTTP(S)は既定名にフォールバック
      if (/^gdrive:/i.test(url)) return 'download.bin';
    }
    const u = new URL(url);
    if (u.protocol !== 'http:' && u.protocol !== 'https:') return 'download.bin';
    const name = u.pathname.split('/').pop() || '';
    return name || 'download.bin';
  } catch {
    return 'download.bin';
  }
}

// 相対パスを絶対パスに変換（PowerShell 実行に適した形式）
async function toAbsoluteExecPath(p, ctx) {
  if (isAbsPath(p)) return p;
  // 相対パスの場合のみ処理(AppConfig基準)
  try {
    const pathApi = await import('@tauri-apps/api/path');
    const base = await pathApi.appConfigDir();
    const joined = await pathApi.join(base, p.replace(/^\.\//, ''));
    // PowerShell 用に Windows のバックスラッシュに正規化
    return joined.replace(/\//g, '\\');
  } catch (e) { try { await logError(`[toAbsoluteExecPath] failed: ${e?.message || e}`); } catch (_) { } return p; }
}

// 実行ファイルをウィンドウ非表示で実行する関数
async function runExecutableQuietWindows(exeAbsPath, args = [], elevate = false, tmpRel, baseDir) {
  const shell = await import('@tauri-apps/plugin-shell');
  const fs = await import('@tauri-apps/plugin-fs');
  const pathApi = await import('@tauri-apps/api/path');
  function psEscape(s) { return String(s).replace(/'/g, "''"); }
  const argList = (args || []).map(a => `'${psEscape(a)}'`).join(', ');
  const exe = psEscape(exeAbsPath);
  const argClause = (args && args.length > 0) ? ` -ArgumentList @(${argList})` : '';
  const body = [
    "$ErrorActionPreference='Stop'",
    "[Console]::OutputEncoding=[System.Text.UTF8Encoding]::new()",
    `$p = Start-Process -FilePath '${exe}'${argClause}${elevate ? ' -Verb RunAs' : ''} -WindowStyle Hidden -Wait -PassThru`,
    "exit ($p.ExitCode)"
  ].join("; ");
  const scriptName = `run-${Date.now()}.ps1`;
  const scriptRel = `${tmpRel.replace(/\\/g, '/')}/${scriptName}`;
  await fs.writeTextFile(scriptRel, body, { baseDir });
  const base = await pathApi.appConfigDir();
  const scriptAbs = await pathApi.join(base, scriptRel);
  const argsPs = ['-NoLogo', '-NoProfile', '-NonInteractive', '-ExecutionPolicy', 'Bypass', '-File', scriptAbs];
  const cmd = shell.Command.create('powershell', argsPs);
  const res = await cmd.execute();
  if (res.code !== 0) {
    throw new Error(`runExecutableQuietWindows failed (exe=${exeAbsPath}, args=${JSON.stringify(args)}, elevate=${!!elevate}) exit=${res.code}, stderr=${(res.stderr || '').slice(0, 500)}`);
  }
}

// インストーラーからダウンロードURLを生成
async function resolveSource(item) {
  // すでにURLの場合はそのまま返す
  if (typeof item?.installer === 'string') return item.installer;
  const src = item?.installer?.source;
  if (!src) return '';
  if (typeof src === 'string') return src;
  if (typeof src.direct === 'string') return src.direct;
  if (src.GoogleDrive && typeof src.GoogleDrive.id === 'string' && src.GoogleDrive.id) {
    // Google Drive は Rust 側のコマンドでのみダウンロードする
    return `gdrive:${src.GoogleDrive.id}`;
  }
  if (src.github && src.github.owner && src.github.repo) {
    // GitHub の最新リリース資産を取得し、パターンに一致するものを選択
    const http = await import('@tauri-apps/plugin-http');
    const owner = src.github.owner;
    const repo = src.github.repo;
    const pattern = src.github.pattern ? new RegExp(src.github.pattern) : null;
    const tag = src.github.tag;
    try {
      const endpoint = tag
        ? `https://api.github.com/repos/${owner}/${repo}/releases/tags/${encodeURIComponent(tag)}`
        : `https://api.github.com/repos/${owner}/${repo}/releases/latest`;
      const res = await http.fetch(endpoint, { method: 'GET' });
      let data = {};
      try { data = await res.json(); } catch (_) { data = {}; }
      const assets = Array.isArray(data?.assets) ? data.assets : [];
      let asset = assets[0];
      if (pattern) {
        const m = assets.find(a => pattern.test(a.name || ''));
        if (m) asset = m;
      }
      if (asset?.browser_download_url) return asset.browser_download_url;
    } catch (e) { try { await logError(`[resolveSource] github fetch failed: ${e?.message || e}`); } catch (_) { } }
  }
  return '';
}

// 絶対パスかどうかを判定
function isAbsPath(p) {
  return /^(?:[a-zA-Z]:[\\\/]|\\\\|\/)/.test(String(p || ''));
}

// 指定 URL（またはローカルパス）を読み取り、toPath に保存
async function downloadTo(url, toPath, toBaseDir) {
  const http = await import('@tauri-apps/plugin-http');
  const fs = await import('@tauri-apps/plugin-fs');
  const { invoke } = await import('@tauri-apps/api/core');
  // 親ディレクトリの存在を保証
  const dir = toPath.replace(/\\/g, '/').split('/').slice(0, -1).join('/') || '.';
  try {
    if (isAbsPath(toPath)) await fs.mkdir(dir, { recursive: true });
    else await fs.mkdir(dir, { baseDir: toBaseDir, recursive: true });
  } catch (_) { }
  try {
    // Google Drive (gdrive:<fileId>) は Rust 側にストリーム保存を委譲
    if (typeof url === 'string' && url.startsWith('gdrive:')) {
      const fileId = url.slice('gdrive:'.length);
      await invoke('drive_download_to_file', { fileId, destPath: toPath });
      return { path: toPath, baseDir: toBaseDir };
    }
    // URL がローカル絶対パスや file:// の場合は、HTTP 経由ではなく直接コピー/読み取り
    let isLocal = false;
    let localPath = '';
    if (typeof url === 'string') {
      if (/^file:\/\//i.test(url)) {
        try {
          const u = new URL(url);
          let p = decodeURIComponent(u.pathname);
          if (/^\/[a-zA-Z]:\//.test(p)) p = p.slice(1);
          localPath = p.replace(/\\/g, '/');
          isLocal = true;
        } catch (_) { /* ignore */ }
      } else if (isAbsPath(url)) {
        localPath = url;
        isLocal = true;
      }
    }

    if (isLocal) {
      const buf = await fs.readFile(localPath);
      if (isAbsPath(toPath)) await fs.writeFile(toPath, buf);
      else await fs.writeFile(toPath, buf, { baseDir: toBaseDir });
      return { path: toPath, baseDir: toBaseDir };
    }

    const res = await http.fetch(url, { method: 'GET' });
    const ab = await res.arrayBuffer();
    const buf = new Uint8Array(ab);
    if (isAbsPath(toPath)) await fs.writeFile(toPath, buf);
    else await fs.writeFile(toPath, buf, { baseDir: toBaseDir });
    return { path: toPath, baseDir: toBaseDir };
  } catch (e) {
    const detail = (e && (e.message || (typeof e === 'object' ? JSON.stringify(e) : String(e)))) || 'unknown error';
    throw new Error(`downloadTo failed (src=${url}, dst=${toPath}): ${detail}`);
  }
}

// ZIPファイルを展開します（Rust実装を優先、失敗時はJavaScriptで展開）
async function extractZip(zipPath, destPath, baseDir) {
  try {
    const { invoke } = await import('@tauri-apps/api/core');
    const base = (!isAbsPath(zipPath) && !isAbsPath(destPath)) ? 'AppConfig' : null;
    await invoke('extract_zip', { zipPath, destPath, base });
    return;
  } catch (e) { try { await logError(`[extractZip] failed: ${e?.message || e}`); } catch (_) { } }
}

// ルート配下を再帰的に走査してファイル一覧（相対パス）を返す
async function listFilesRecursive(rootRel, baseDir) {
  const fs = await import('@tauri-apps/plugin-fs');
  const out = [];
  async function walk(rel) {
    const entries = isAbsPath(rel) ? await fs.readDir(rel) : await fs.readDir(rel, { baseDir });
    for (const e of entries) {
      const path = `${rel}/${e.name}`;
      if (e.isDirectory) await walk(path);
      else out.push(path);
    }
  }
  await walk(rootRel);
  return out;
}

// 簡易globマッチ
function simpleGlobMatch(pattern, path) {
  // サポート: ** は任意の深さ、* は 1 セグメント、Windows 風パスでは大文字小文字を無視
  let p = String(pattern || '').replace(/\\/g, '/');
  let x = String(path || '').replace(/\\/g, '/');
  // マッチングのために小文字へ正規化（Windows）
  p = p.toLowerCase();
  x = x.toLowerCase();
  if (!p.includes('*')) return p === x;
  const esc = s => s.replace(/[.+?^${}()|[\]\\]/g, '\\$&'); // '*' はエスケープしない
  let re = esc(p);
  // まず ** を .* に置換
  re = re.replace(/\*\*/g, '.*');
  // 次に残りの * を [^/]* に置換
  re = re.replace(/\*/g, '[^/]*');
  const rx = new RegExp('^' + re + '$');
  return rx.test(x);
}

// パターンに一致するファイル/ディレクトリをまとめてコピー
// Plugin/ ディレクトリが含まれる場合は、その配下構造を維持してコピー 
// `toDirRel`: 転送先のディレクトリ（相対 or 絶対） `baseDir`: 相対パス時のベース（通常は AppConfig）
async function copyPattern(fromPattern, toDirRel, baseDir) {
  const fs = await import('@tauri-apps/plugin-fs');
  const shell = await import('@tauri-apps/plugin-shell');
  const pathApi = await import('@tauri-apps/api/path');
  // toDirRel が未指定/空ならカレント相対にフォールバック
  let toDir = String(toDirRel || '.');
  toDir = toDir.replace(/\\/g, '/').replace(/\/+$/, '') || '.';
  const norm = String(fromPattern || '').replace(/\\/g, '/');
  // 末尾の "/*" は再帰コピー（"/**/*"）とみなし、サブフォルダも含める
  const effective = norm.replace(/\/\*$/, '/**/*');
  const starIdx = effective.search(/\*/);
  let root = '.';
  if (starIdx === -1) {
    root = effective.includes('/') ? effective.split('/').slice(0, -1).join('/') : '.';
  } else {
    const base = effective.slice(0, starIdx);
    root = base.endsWith('/') ? base.slice(0, -1) : (base || '.');
  }
  let files = [];
  try { files = await listFilesRecursive(root, baseDir); } catch (e) { try { await logError(`[copyPattern] listFilesRecursive failed (root=${root}): ${e?.message || e}`); } catch (_) { } files = []; }
  // フォールバック: 再帰パターンで見つからない場合は 1 つ上のディレクトリを root として試す
  if ((!files || files.length === 0) && /\*\*/.test(effective)) {
    const up = root.includes('/') ? root.split('/').slice(0, -1).join('/') : '.';
    if (up && up !== root) {
      try { files = await listFilesRecursive(up, baseDir); root = up; } catch (e) { try { await logError(`[copyPattern] up one level failed (up=${up}): ${e?.message || e}`); } catch (_) { } }
    }
  }
  let matched = files.filter(p => simpleGlobMatch(effective, p));
  // 追加フォールバック: パターンが "/Plugin/" を直接狙うがアーカイブに余分な階層がある場合、任意の深さの Plugin/ を許可
  if (matched.length === 0 && /\/plugin\//i.test(effective)) {
    const alt = effective
      .replace(/\/plugin\/\*\*?\/*$/i, '/**/plugin/**/*')
      .replace(/\/plugin\/\*$/i, '/**/plugin/**/*');
    matched = files.filter(p => simpleGlobMatch(alt, p));
  }
  // 強いフォールバック: それでも 0 件なら tmp 配下の最初の Plugin フォルダを直接走査
  if (matched.length === 0 && /\/plugin\//i.test(effective)) {
    // /Plugin/ まで（直前）を tmp のベースとして決定
    const idx = effective.toLowerCase().indexOf('/plugin/');
    const tmpBase = idx > 0 ? effective.slice(0, idx) : root;
    const pluginRoot = tmpBase.replace(/\/+$/, '') + '/Plugin';
    // pluginRoot が存在すればそこから走査
    try {
      const exists = await fs.readDir(pluginRoot, { baseDir });
      if (Array.isArray(exists)) {
        const subFiles = await listFilesRecursive(pluginRoot, baseDir);
        matched = subFiles;
        // 相対パスが Plugin/ 配下になるよう root を調整
        root = pluginRoot;
      }
    } catch (e) { try { await logError(`[copyPattern] probing Plugin root failed: ${e?.message || e}`); } catch (_) { } }
  }
  if (isAbsPath(toDir)) await fs.mkdir(toDir, { recursive: true });
  else await fs.mkdir(toDir, { baseDir, recursive: true });

  // 転送先が絶対パスかつ Plugin/ を対象にする場合、PowerShell の一括コピーを優先（権限や UAC に強い）
  if (matched.length > 0 && isAbsPath(toDir) && /\/plugin\//i.test(effective)) {
    try {
      // 絶対ソースの Plugin ルートを決定
      const first = matched[0];
      let pRoot = first;
      const idxP = first.toLowerCase().indexOf('/plugin/');
      if (idxP >= 0) pRoot = first.slice(0, idxP + '/Plugin'.length);
      // pRoot は AppConfig 基準の相対なので絶対パスへ変換
      const baseAbs = await pathApi.appConfigDir();
      const srcPluginAbs = await pathApi.join(baseAbs, pRoot);
      // PowerShell コマンドを構築
      function psEscape(s) { return String(s).replace(/'/g, "''"); }
      const ps = shell.Command.create('powershell', [
        '-NoProfile', '-NonInteractive', '-ExecutionPolicy', 'Bypass', '-Command',
        `Copy-Item -Path '${psEscape(srcPluginAbs)}\\*' -Destination '${psEscape(toDir)}' -Recurse -Force -ErrorAction Stop`
      ]);
      const res = await ps.execute();
      if (res.code === 0) return {
        count: matched.length, outputs: matched.map(src => {
          // 一致したファイルを Plugin/ 以下の構造を保ったまま転送先に対応付け
          let rel;
          const idxPlugin2 = src.indexOf('/Plugin/');
          if (idxPlugin2 >= 0) rel = src.slice(idxPlugin2 + '/Plugin/'.length);
          else rel = src.startsWith(root + '/') ? src.slice(root.length + 1) : src.split('/').pop();
          return `${toDir}/${rel}`;
        })
      };
      // 非 0（失敗）ならファイル単位コピーへフォールスルー
    } catch (_) { /* fall back to file-by-file */ }
  }
  const outputs = [];
  for (const src of matched) {
    // Plugin/ が含まれる場合はその配下構造を保持。なければ root 配下として配置
    let rel;
    const idxPlugin = src.indexOf('/Plugin/');
    if (idxPlugin >= 0) rel = src.slice(idxPlugin + '/Plugin/'.length);
    else rel = src.startsWith(root + '/') ? src.slice(root.length + 1) : src.split('/').pop();
    const dst = `${toDir}/${rel}`;
    const dstDir = dst.replace(/\\/g, '/').split('/').slice(0, -1).join('/') || '.';
    try {
      // 転送先のサブディレクトリを作成しておく
      if (isAbsPath(dstDir)) await fs.mkdir(dstDir, { recursive: true });
      else await fs.mkdir(dstDir, { baseDir, recursive: true });
      if (!isAbsPath(dst)) {
        await fs.copyFile(src, dst, { baseDir });
      } else {
        // base を跨ぐコピー
        const buf = isAbsPath(src) ? await fs.readFile(src) : await fs.readFile(src, { baseDir });
        await fs.writeFile(dst, buf);
      }
    } catch (e) {
      const buf = isAbsPath(src) ? await fs.readFile(src) : await fs.readFile(src, { baseDir });
      // ディレクトリ作成後に read/write でリトライ
      if (isAbsPath(dst)) await fs.writeFile(dst, buf);
      else await fs.writeFile(dst, buf, { baseDir });
    }
    outputs.push(dst);
  }
  return { count: matched.length, outputs };
}


// 外部コマンドを実行（PowerShell）
async function runCommand(path, args = [], elevate = false) {
  const shell = await import('@tauri-apps/plugin-shell');
  const os = navigator.userAgent.includes('Windows');
  if (os) {
    function psEscape(s) { return String(s).replace(/'/g, "''"); }
    const argsList = (args || []).map(a => `'${psEscape(a)}'`).join(', ');
    const psPath = psEscape(path);
    const script = `& { $ErrorActionPreference='Stop'; [Console]::OutputEncoding=[System.Text.UTF8Encoding]::new(); $p = Start-Process -FilePath '${psPath}' -ArgumentList @(${argsList})${elevate ? ' -Verb RunAs' : ''} -WindowStyle Hidden -Wait -PassThru; exit ($p.ExitCode) } *> $null`;
    const psArgs = [
      '-NoProfile',
      '-NonInteractive',
      '-ExecutionPolicy', 'Bypass',
      '-Command', script
    ];
    const cmd = shell.Command.create('powershell', psArgs);
    const res = await cmd.execute();
    if (res.code !== 0) {
      throw new Error(`runCommand failed (path=${path}, args=${JSON.stringify(args)}, elevate=${!!elevate}) exit=${res.code}, stderr=${(res.stderr || '').slice(0, 500)}`);
    }
    return res;
  } else {
    const cmd = shell.Command.create(path, args);
    const res = await cmd.execute();
    if (res.code !== 0) throw new Error(`runCommand failed (path=${path}, args=${JSON.stringify(args)}) exit=${res.code}, stderr=${(res.stderr || '').slice(0, 500)}`);
    return res;
  }
}

// インストーラの存在を判定
export function hasInstaller(item) {
  // 文字列ショートハンド形式の installer も有効とみなす
  return !!(item && item.installer && (typeof item.installer === 'string' || Array.isArray(item.installer.install)));
}

// -------------------------
// インストーラー&アンインストーラーの実行
// -------------------------


// インストールの実行
export async function runInstallerForItem(item, dispatch) {
  // 実行用コンテキストを構築
  const version = latestVersionOf(item);
  const idVersion = `${item.id}-${version || 'latest'}`.replace(/[^A-Za-z0-9._-]/g, '_');
  const tmp = await ensureTmpDir(idVersion);
  const settings = await ensurePaths(['appDir', 'pluginsDir']); // 不必要？

  const ctx = {
    id: item.id,
    version,
    tmpDir: `${tmp.rel}`,
    appDir: settings.appDir,
    pluginsDir: settings.pluginsDir,
    scriptsDir: settings.scriptsDir || '',
    downloadPath: '',
    productCode: item?.installer?.context?.productCode || item?.installer?.productCode || '',
    baseDir: tmp.baseDir,
  };

  // ダウンロード元 URL を決定
  const url = await resolveSource(item);
  if (!url) throw new Error('ダウンロード元 URL が見つかりません');
  const suggested = fileNameFromUrl(url);
  const ext = (suggested.split('.').pop() || '').toLowerCase();

  // 明示的な手順が無い場合は download -> run（またはzipの場合はextract）にフォールバック（ショートハンド対応）
  const steps = (Array.isArray(item.installer?.install) && item.installer.install.length)
    ? item.installer.install
    : (ext === 'zip'
      ? [
        { action: 'download', to: `{tmp}/${suggested}` },
        { action: 'extract', from: `{tmp}/${suggested}`, to: `{pluginsDir}` },
      ]
      : [
        { action: 'download', to: `{tmp}/${suggested}` },
        { action: 'run', path: '{download}', args: [], elevate: true },
      ]
    );

  try {
    await logInfo(`[installer ${item.id}] start version=${version || ''} steps=${steps.length}`);
    for (let idx = 0; idx < steps.length; idx++) {
      const step = steps[idx];
      try {
        switch (step.action) {
          case 'download': {
            const toRaw = expandMacros(step.to || '', ctx);
            const isGDrive = typeof url === 'string' && url.startsWith('gdrive:');
            let toRel = toRaw;
            const looksDir = !toRaw || toRaw === ctx.tmpDir || /[\\\/]$/.test(toRaw);
            if (!toRaw) {
              toRel = isGDrive ? `{tmp}` : `{tmp}/${suggested}`;
            } else if (looksDir) {
              toRel = isGDrive ? toRaw.replace(/[\\\/]$/, '') : `${toRaw.replace(/[\\\/]$/, '')}/${suggested}`;
            }
            const toPath = expandMacros(toRel, ctx);
            await downloadTo(url, toPath, tmp.baseDir);
            // GoogleDrive はディレクトリ基準で扱い、後続の {download} はディレクトリを指す
            ctx.downloadPath = toPath;
            break;
          }
          case 'extract': {
            const fromRel = expandMacros(step.from || ctx.downloadPath, ctx);
            const toRel = expandMacros(step.to || `{tmp}/extracted`, ctx);
            await extractZip(fromRel, toRel, tmp.baseDir);
            break;
          }
          case 'copy': {
            const from = expandMacros(step.from, ctx);
            const to = expandMacros(step.to, ctx);
            const res = await copyPattern(from, to, tmp.baseDir);
            const n = res?.count || 0;
            if (n === 0) {
              throw new Error(`copy matched 0 files (from=${from} to=${to})`);
            }
            // try { await recordInstalledOutputs(item.id, res.outputs || []); } catch (_) { }
            break;
          }
          // case 'delete': {
          //   const path = expandMacros(step.path, ctx);
          //   if (/\*/.test(path)) {
          //     const n = await deletePattern(path, tmp.baseDir);
          //     if (n === 0) throw new Error(`delete matched 0 files (pattern=${path})`);
          //   } else {
          //     await deletePath(path, tmp.baseDir);
          //   }
          //   break;
          // }
          case 'run': {
            const pRaw = expandMacros(step.path, ctx);
            const args = (step.args || []).map(a => expandMacros(String(a), ctx));
            const pAbs = await toAbsoluteExecPath(pRaw, ctx);
            if (navigator.userAgent.includes('Windows')) {
              await runExecutableQuietWindows(pAbs, args, !!step.elevate, ctx.tmpDir, tmp.baseDir);
            } else {
              await runCommand(pAbs, args, !!step.elevate);
            }
            break;
          }
          default:
            throw new Error(`unsupported action: ${String(step.action)}`);
        }
      } catch (e) {
        const detail = (e && (e.message || (typeof e === 'object' ? JSON.stringify(e) : String(e)))) || 'unknown error';
        const msg = `[installer ${item.id}] step ${idx + 1}/${steps.length} action=${step.action} failed: ${detail}`;
        try { await logError(msg); } catch (_) { }
        throw new Error(msg);
      }
    }

    // インストール済みとして記録し、最新判定のために検出結果を更新
    await addInstalledId(item.id, version);
    if (dispatch) {
      const map = await detectInstalledVersionsMap([item]);
      const detected = String((map && map[item.id]) || '');
      dispatch({ type: 'SET_DETECTED_ONE', payload: { id: item.id, version: detected } });
    }
    await logInfo(`[installer ${item.id}] completed version=${version || ''}`);
    // 後始末: 一時作業フォルダを削除（成功時のみ）
    try {
      const fs = await import('@tauri-apps/plugin-fs');
      await fs.remove('installer-tmp', { baseDir: fs.BaseDirectory.AppConfig, recursive: true });
    } catch (_) { /* ignore cleanup errors */ }
  } catch (e) {
    const detail = (e && (e.message || (typeof e === 'object' ? JSON.stringify(e) : String(e)))) || 'unknown error';
    try { await logError(`[installer ${item.id}] error: ${detail}`); } catch (_) { }
    throw e;
  }
}

// アンインストールを実行
export async function runUninstallerForItem(item, dispatch) {
  const version = latestVersionOf(item);
  const idVersion = `${item.id}-${version || 'latest'}`.replace(/[^A-Za-z0-9._-]/g, '_');
  const tmp = await ensureTmpDir(idVersion);
  const settings = await ensurePaths(['appDir', 'pluginsDir', 'scriptsDir']);
  const ctx = {
    id: item.id,
    version,
    tmpDir: `${tmp.rel}`,
    appDir: settings.appDir,
    pluginsDir: settings.pluginsDir,
    scriptsDir: settings.scriptsDir || '',
    downloadPath: '',
    productCode: item?.installer?.context?.productCode || item?.installer?.productCode || '',
    baseDir: tmp.baseDir,
  };

  try {
    await logInfo(`[uninstall ${item.id}] start steps=${item.installer.uninstall.length}`);
    function normalizeAbsWindowsPath(p) {
      let s = String(p || '');
      // 末尾のスラッシュ/バックスラッシュを除去
      s = s.replace(/[\\/]+$/, '');
      return s;
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
        } catch (e1) {
          // 一度失敗したら stat で種類を確認して削除をやり直す
          try {
            const st = await fs.stat(absPath);
            if (st.isDirectory) {
              await fs.remove(absPath, { recursive: true });
            } else {
              await fs.remove(absPath);
            }
            ok = true;
          } catch (e2) {
            lastErr = e2;
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
    // アンインストール手順を順に実行
    for (let i = 0; i < item.installer.uninstall.length; i++) {
      const step = item.installer.uninstall[i];
      try {
        switch (step.action) {
          case 'delete': {
            const p = expandMacros(step.path, ctx);
            try {
              const allowedRoots = [ctx.pluginsDir, ctx.scriptsDir].filter(Boolean);
              const abs = isAbsPath(p) ? p : p; // アンインストールのパスは原則絶対パス。相対ならそのまま扱う
              const ok = await deletePath(abs);
              if (ok) await logInfo(`[uninstall ${item.id}] delete ok path="${p}"`);
              else await logInfo(`[uninstall ${item.id}] delete skip (not found) path="${p}"`);
            } catch (e) {
              throw new Error(`delete failed path=${p}: ${e?.message || e}`);
            }
            break;
          }
          case 'run': {
            const pRaw = expandMacros(step.path, ctx);
            const args = (step.args || []).map(a => expandMacros(String(a), ctx));
            const pAbs = await toAbsoluteExecPath(pRaw, ctx);
            if (navigator.userAgent.includes('Windows')) {
              await runExecutableQuietWindows(pAbs, args, !!step.elevate, ctx.tmpDir, tmp.baseDir);
            } else {
              await runCommand(pAbs, args, !!step.elevate);
            }
            await logInfo(`[uninstall ${item.id}] run ok path="${pAbs}" args=${JSON.stringify(args)}`);
            break;
          }
          default:
            await logInfo(`[uninstall ${item.id}] skip unsupported action=${String(step.action)}`);
            break;
        }
      } catch (e) {
        const msg = `[uninstall ${item.id}] step ${i + 1}/${item.installer.uninstall.length} action=${step.action} failed: ${e?.message || e}`;
        try { await logError(msg); } catch (_) { }
        throw new Error(msg);
      }
    }
  } catch (e) {
    // ログ出力後にエラーを伝播させる
    throw e;
  }

  await removeInstalledId(item.id);
  if (dispatch) {
    // 状態の正確さを保つため再検出
    const map = await detectInstalledVersionsMap([item]);
    const detected = String((map && map[item.id]) || '');
    dispatch({ type: 'SET_DETECTED_ONE', payload: { id: item.id, version: detected } });
  }
  await logInfo(`[uninstall ${item.id}] completed`);
}
