// use crate::paths::Dir;
use once_cell::sync::Lazy;
use std::path::{self, PathBuf};
use std::sync::RwLock;
use tauri::{Emitter, Manager};

mod api_key;
mod paths;

// -----------------------
// Google Drive ダウンロード
// -----------------------

// DataRootにします

// エラー型定義
// - thiserrorでエラーメッセージを自動実装
// - Serializeは、フロント側へJSONで返したい場合などに備えて付与
#[derive(thiserror::Error, Debug, serde::Serialize)]
enum DriveError {
    #[error("io error: {0}")]
    Io(String),
    #[error("http error: {0}")]
    Http(String),
    #[error("network error: {0}")]
    Net(String),
}

/// Windowsドライブ指定（"C:\..."）やUNIXの絶対パス（"/..."）を判定
fn is_abs(p: &str) -> bool {
    let s = p.replace('\\', "/");
    s.starts_with('/') || (s.len() >= 3 && s.as_bytes()[1] == b':' && (s.as_bytes()[2] == b'/' || s.as_bytes()[2] == b'\\'))
}

/// 相対パスをアプリの設定ディレクトリ基準に解決
/// - 絶対パスならそのまま返す
/// - 取得に失敗した場合は一時ディレクトリを基準にする
fn resolve_rel_to_app_config(app: &tauri::AppHandle, p: &str) -> PathBuf {
    if is_abs(p) {
        PathBuf::from(p)
    } else {
        app.path().app_config_dir().unwrap_or_else(|_| std::env::temp_dir()).join(p)
    }
}

fn sanitize_filename(name: &str) -> String {
    let mut out = String::new();
    for ch in name.chars() {
        // forbid separators and reserved Windows characters
        if matches!(ch, '/' | '\\' | ':' | '*' | '?' | '"' | '<' | '>' | '|') {
            out.push('_');
        } else {
            out.push(ch);
        }
    }
    let trimmed = out.trim();
    if trimmed.is_empty() {
        String::from("download.bin")
    } else {
        trimmed.to_string()
    }
}

async fn drive_fetch_response(file_id: &str, api_key: &str) -> Result<reqwest::Response, DriveError> {
    let url = format!("https://www.googleapis.com/drive/v3/files/{}?alt=media", file_id);
    let client = reqwest::Client::builder().user_agent("AviUtl2Catalog").build().map_err(|e| DriveError::Net(format!("client build failed: {}", e)))?;
    let res = client.get(url).header("x-goog-api-key", api_key).send().await.map_err(|e| DriveError::Net(e.to_string()))?;
    if res.status().is_success() {
        return Ok(res);
    }
    let status = res.status();
    let text = res.text().await.unwrap_or_default();
    let msg = serde_json::from_str::<serde_json::Value>(&text)
        .ok()
        .and_then(|v| v.get("error")?.get("message")?.as_str().map(|s| s.to_string()))
        .unwrap_or_else(|| text.chars().take(500).collect());
    Err(DriveError::Http(format!("{} {}", status, msg)))
}

async fn drive_fetch_name_reqwest(file_id: &str, api_key: &str) -> Result<String, DriveError> {
    let url = format!("https://www.googleapis.com/drive/v3/files/{}?fields=name", file_id);
    let client = reqwest::Client::builder().user_agent("AviUtl2Catalog").build().map_err(|e| DriveError::Net(format!("client build failed: {}", e)))?;
    let res = client.get(url).header("x-goog-api-key", api_key).send().await.map_err(|e| DriveError::Net(e.to_string()))?;
    let status = res.status();
    let text = res.text().await.map_err(|e| DriveError::Net(e.to_string()))?;
    if !status.is_success() {
        let msg: String = if let Ok(v) = serde_json::from_str::<serde_json::Value>(&text) {
            v.get("error").and_then(|e| e.get("message")).and_then(|m| m.as_str()).map(|s| s.to_string()).unwrap_or_else(|| text.clone())
        } else {
            text.clone()
        };
        return Err(DriveError::Http(format!("{} {}", status, msg)));
    }
    let v: serde_json::Value = serde_json::from_str(&text).map_err(|e| DriveError::Net(e.to_string()))?;
    let name = v.get("name").and_then(|x| x.as_str()).ok_or_else(|| DriveError::Http(String::from("missing name field")))?;
    Ok(sanitize_filename(name))
}

#[tauri::command]
async fn drive_download_to_file(window: tauri::Window, file_id: String, dest_path: String) -> Result<(), DriveError> {
    use std::fs::{create_dir_all, OpenOptions};
    use std::io::Write;

    let app = window.app_handle();
    let api_key: &str = api_key::GOOGLE_DRIVE_API_KEY;
    let dest_abs = resolve_rel_to_app_config(&app, &dest_path);
    let looks_dir = dest_path.ends_with('/') || dest_path.ends_with('\\') || dest_abs.is_dir();
    let is_placeholder = dest_abs.file_name().and_then(|s| s.to_str()).map(|s| s.eq_ignore_ascii_case("download.bin") || s == file_id).unwrap_or(true);
    let drive_name = match drive_fetch_name_reqwest(&file_id, api_key).await {
        Ok(n) => n,
        Err(e) => {
            // ログに出力
            log_error(&app, &format!("failed to fetch drive file name (id={}): {}", file_id, e));
            // そのままエラーを返して終了
            return Err(e);
        }
    };

    let final_dest = if looks_dir || is_placeholder {
        if looks_dir {
            dest_abs.join(&drive_name)
        } else {
            dest_abs.parent().map(|p| p.join(&drive_name)).unwrap_or(dest_abs.clone())
        }
    } else {
        dest_abs.clone()
    };
    if let Some(parent) = final_dest.parent() {
        let _ = create_dir_all(parent);
    }

    // Try reqwest (async)
    match drive_fetch_response(&file_id, api_key).await {
        Ok(mut res) => {
            let mut f = OpenOptions::new().create(true).truncate(true).write(true).open(&final_dest).map_err(|e| DriveError::Io(e.to_string()))?;

            let total_opt = res.headers().get(reqwest::header::CONTENT_LENGTH).and_then(|v| v.to_str().ok()).and_then(|s| s.parse::<u64>().ok());

            let mut read: u64 = 0;
            while let Some(chunk) = res.chunk().await.map_err(|e| DriveError::Net(e.to_string()))? {
                f.write_all(&chunk).map_err(|e| DriveError::Io(e.to_string()))?;
                read += chunk.len() as u64;
                let _ = window.emit("drive:progress", serde_json::json!({ "fileId": file_id, "read": read, "total": total_opt }));
            }
            let _ = window.emit("drive:done", serde_json::json!({ "fileId": file_id, "path": final_dest.to_string_lossy() }));
            Ok(())
        }
        Err(e) => Err(e),
    }
}

// -------------------------
// ハッシュ計算 (OK)
// -------------------------

// ファイルのハッシュ(xxh3-128)を計算
use std::{fs, path::Path};
use xxhash_rust::xxh3::xxh3_128;

pub fn xxh3_128_hex<P: AsRef<Path>>(path: P) -> Result<String, String> {
    let buf = fs::read(path).map_err(|e| format!("open/read error: {}", e))?;
    let h = xxh3_128(&buf);
    Ok(format!("{:032x}", h))
}

// -------------------------
// カタログインデックスとRust内での検索処理
// -------------------------

// カタログアイテムのインデックス情報を保持する構造体
#[derive(Clone)]
struct IndexItem {
    id: String,
    name_key: String,
    author_key: String,
    summary_key: String,
    item_type: String,
    tags: Vec<String>,
    updated_at: Option<i64>,
}

// カタログアイテムのグローバルな検索インデックス
static CATALOG: Lazy<RwLock<Vec<IndexItem>>> = Lazy::new(|| RwLock::new(Vec::new()));

// テキストの正規化処理（全角→半角、カタカナ→ひらがな変換）
fn normalize(s: &str) -> String {
    let mut out = String::with_capacity(s.len());
    for ch in s.trim().to_lowercase().chars() {
        let code = ch as u32;
        // 全角ASCII文字を半角に変換: FF01-FF5E -> 21-7E
        if (0xFF01..=0xFF5E).contains(&code) {
            let mapped = std::char::from_u32(code - 0xFEE0).unwrap_or(ch);
            out.push(mapped);
            continue;
        }
        // 全角スペースを通常のスペースに変換
        if code == 0x3000 {
            out.push(' ');
            continue;
        }
        // カタカナをひらがなに変換: 30A1-30F6 -> 3041-3096
        if (0x30A1..=0x30F6).contains(&code) {
            let mapped = std::char::from_u32(code - 0x60).unwrap_or(ch);
            out.push(mapped);
            continue;
        }
        out.push(ch);
    }
    out
}

// 更新日時の解析処理（versions/version配列から最後のrelease_dateを取得）
fn parse_updated_at(value: &serde_json::Value) -> Option<i64> {
    // Mirror JS logic: take the last entry of versions/version array and parse release_date (YYYY-MM-DD)
    let arr_opt = if let Some(v) = value.get("versions") {
        v.as_array()
    } else if let Some(v) = value.get("version") {
        v.as_array()
    } else {
        None
    };
    let arr = match arr_opt {
        Some(a) => a,
        None => return None,
    };
    if arr.is_empty() {
        return None;
    }
    let last = &arr[arr.len() - 1];
    let s = last.get("release_date").and_then(|v| v.as_str()).unwrap_or("");
    // YYYY-MM-DDまたはYYYY/MM/DDを受け入れ、非常に寛容
    let s = s.replace('/', "-");
    let parts: Vec<&str> = s.split('-').collect();
    if parts.len() < 3 {
        return None;
    }
    let y = parts[0].parse::<i32>().ok()?;
    let m = parts[1].parse::<u8>().ok()?;
    let d = parts[2].parse::<u8>().ok()?;
    // time crateを使用してUnix msに変換
    use time::{Date, Month, PrimitiveDateTime, Time};
    let month = Month::try_from(m).ok()?;
    let date = Date::from_calendar_date(y, month, d).ok()?;
    let dt = PrimitiveDateTime::new(date, Time::MIDNIGHT);
    Some(dt.assume_utc().unix_timestamp() * 1000)
}

// カタログインデックスを設定し、検索用データ構造を構築
#[tauri::command]
fn set_catalog_index(items: Vec<serde_json::Value>) -> Result<usize, String> {
    let mut v: Vec<IndexItem> = Vec::with_capacity(items.len());
    for it in items {
        let id = it.get("id").and_then(|v| v.as_str()).unwrap_or("").to_string();
        if id.is_empty() {
            continue;
        }
        let name = it.get("name").and_then(|v| v.as_str()).unwrap_or("").to_string();
        let item_type = it.get("type").and_then(|v| v.as_str()).unwrap_or("").to_string();
        let tags: Vec<String> =
            it.get("tags").and_then(|v| v.as_array()).map(|arr| arr.iter().filter_map(|x| x.as_str().map(|s| s.to_string())).collect::<Vec<_>>()).unwrap_or_default();
        let author = it.get("author").and_then(|v| v.as_str()).unwrap_or("").to_string();
        let summary = it.get("summary").and_then(|v| v.as_str()).unwrap_or("").to_string();
        let updated_at = parse_updated_at(&it);
        let item = IndexItem {
            id,
            name_key: normalize(&name),
            author_key: normalize(&author),
            summary_key: normalize(&summary),
            item_type,
            tags,
            updated_at,
        };
        v.push(item);
    }
    let mut guard = CATALOG.write().map_err(|_| String::from("catalog lock poisoned"))?;
    *guard = v;
    Ok(guard.len())
}

// カタログ検索クエリ実行
#[tauri::command]
fn query_catalog_index(q: Option<String>, tags: Option<Vec<String>>, types: Option<Vec<String>>, sort: Option<String>, dir: Option<String>) -> Vec<String> {
    let guard = match CATALOG.read() {
        Ok(g) => g,
        Err(_) => return Vec::new(),
    };
    let qnorm = q.unwrap_or_default();
    let terms: Vec<String> = normalize(&qnorm).split_whitespace().filter(|s| !s.is_empty()).map(|s| s.to_string()).collect();
    let tag_filter = tags.unwrap_or_default();
    let type_filter = types.unwrap_or_default();
    let mut filtered: Vec<&IndexItem> = guard
        .iter()
        .filter(|it| {
            // クエリでのフィルタリング
            let qok = if terms.is_empty() { true } else { terms.iter().all(|t| it.name_key.contains(t) || it.author_key.contains(t) || it.summary_key.contains(t)) };
            if !qok {
                return false;
            }
            // タグでのフィルタリング（OR条件）
            let tag_ok = if tag_filter.is_empty() { true } else { it.tags.iter().any(|t| tag_filter.iter().any(|x| x == t)) };
            if !tag_ok {
                return false;
            }
            // 種別でのフィルタリング（OR条件）
            let type_ok = if type_filter.is_empty() { true } else { type_filter.iter().any(|x| x == &it.item_type) };
            type_ok
        })
        .collect();

    let sort_key = sort.unwrap_or_else(|| "newest".to_string());
    let dir_key = dir.unwrap_or_else(|| if sort_key == "name" { "asc".to_string() } else { "desc".to_string() });
    match sort_key.as_str() {
        "name" => {
            filtered.sort_by(|a, b| a.name_key.cmp(&b.name_key));
            if dir_key == "desc" {
                filtered.reverse();
            }
        }
        _ => {
            filtered.sort_by(|a, b| match (a.updated_at, b.updated_at) {
                (Some(au), Some(bu)) => au.cmp(&bu),
                (Some(_), None) => std::cmp::Ordering::Greater,
                (None, Some(_)) => std::cmp::Ordering::Less,
                (None, None) => a.name_key.cmp(&b.name_key),
            });
            if dir_key == "desc" {
                filtered.reverse();
            }
        }
    }
    filtered.iter().map(|it| it.id.clone()).collect()
}

// -----------------------
// ZIPファイル解凍
// -----------------------

#[tauri::command]
// zip_path: 解凍するZIPファイルのパス（絶対または相対）
fn extract_zip(app: tauri::AppHandle, zip_path: String, dest_path: String, base: Option<String>) -> Result<(), String> {
    // 相対/別名ベースを解決して、絶対（に相当する）PathBufへ
    let zip_abs = resolve_base(&app, &zip_path, &base);
    let dest_abs = resolve_base(&app, &dest_path, &base);

    // コア処理へ委譲（絶対パス版）
    extract_zip_abs(&zip_abs, &dest_abs)
}

use std::fs::File;
use zip::read::ZipArchive;
// 絶対パスを受け取って解凍するコア処理
pub fn extract_zip_abs(zip_abs: &Path, dest_abs: &Path) -> Result<(), String> {
    let file = File::open(zip_abs).map_err(|e| format!("open zip error: {}", e))?;
    let mut archive = ZipArchive::new(file).map_err(|e| format!("zip open error: {}", e))?;
    archive.extract(dest_abs).map_err(|e| format!("extract error: {}", e))?;
    Ok(())
}

/// 相対パスを基準ディレクトリから解決する
fn resolve_base(app: &tauri::AppHandle, p: &str, base: &Option<String>) -> PathBuf {
    if is_abs(p) {
        return PathBuf::from(p);
    }
    match base.as_deref() {
        Some("AppConfig") | Some("app_config") | Some("app-config") | None => {
            if let Ok(dir) = app.path().app_config_dir() {
                return dir.join(p);
            }
            PathBuf::from(p)
        }
        Some(_) => PathBuf::from(p),
    }
}

// -----------------------
// インストール済みバージョン検出
// -----------------------

#[derive(Default, Clone)]
struct Settings {
    app_dir: String,
    plugins_dir: String,
    scripts_dir: String,
}

fn is_abs_path(p: &str) -> bool {
    let s = p.replace('\\', "/");
    s.starts_with('/') || (s.len() >= 3 && s.as_bytes()[1] == b':' && (s.as_bytes()[2] == b'/' || s.as_bytes()[2] == b'\\'))
}

fn normalize_saved_path(mut s: String) -> String {
    if s.is_empty() {
        return s;
    }
    // 不足しているコロンを挿入（バックスラッシュ形式用）例：C\ProgramData -> C:\ProgramData
    if s.len() >= 2 && s.as_bytes()[1] != b':' {
        if (s.as_bytes()[0] as char).is_ascii_alphabetic() && (s.as_bytes()[1] == b'\\' || s.as_bytes()[1] == b'/') {
            let mut out = String::with_capacity(s.len() + 1);
            out.push(s.as_bytes()[0] as char);
            out.push(':');
            out.push_str(&s[1..]);
            s = out;
        }
    }
    s
}

// マクロ展開処理（{appDir}、{pluginsDir}などのプレースホルダーを実際のパスに置換）
fn expand_macros(s: &str, ctx: &std::collections::HashMap<&str, &str>) -> String {
    let mut out = s.to_string();
    for (k, v) in ctx.iter() {
        let pat = format!("{{{}}}", k);
        out = out.replace(&pat, v);
    }
    out
}

// アプリケーション設定ディレクトリのパスを取得
fn app_config_dir(app: &tauri::AppHandle) -> std::path::PathBuf {
    app.path().app_config_dir().unwrap_or_else(|_| std::env::temp_dir())
}

// -----------------------
// ログ出力
// -----------------------

// // ログファイルに1行書き込み
fn log_line(app: &tauri::AppHandle, level: &str, msg: &str) {
    use chrono::Local;
    use std::fs::{create_dir_all, OpenOptions};
    use std::io::Write;
    let file = app_config_dir(app).join("logs/app.log");
    let _ = create_dir_all(file.parent().unwrap());
    // タイムスタンプ： "YYYY-MM-DD HH:MM:SS.mmm"
    let ts = Local::now().format("%Y-%m-%d %H:%M:%S%.3f");
    let line = format!("[{}] [{}] {}\n", ts, level, msg);
    if let Ok(mut f) = OpenOptions::new().create(true).append(true).open(file) {
        let _ = f.write_all(line.as_bytes());
    }
}

// ログレベル別のヘルパー関数
fn log_info(app: &tauri::AppHandle, msg: &str) {
    log_line(app, "INFO", msg);
}
fn log_error(app: &tauri::AppHandle, msg: &str) {
    log_line(app, "ERROR", msg);
}

// log_cmd: JSから呼び出されるコマンド
#[tauri::command]
fn log_cmd(app: tauri::AppHandle, level: String, msg: String) {
    log_line(&app, &level, &msg);
}

// logファイルの行数を max_lines まで削減
fn prune_log_file(app: &tauri::AppHandle, max_lines: usize) -> Result<(), String> {
    use std::fs::{create_dir_all, OpenOptions};
    use std::io::{Read, Write};

    let base = app_config_dir(app);
    let logs = base.join("logs");
    let _ = create_dir_all(&logs);
    let file = logs.join("app.log");
    if !file.exists() {
        return Ok(());
    }

    let mut f = match OpenOptions::new().read(true).open(&file) {
        Ok(x) => x,
        Err(_) => return Ok(()),
    };
    let mut buf = String::new();
    if f.read_to_string(&mut buf).is_err() {
        return Ok(());
    }
    let lines: Vec<&str> = buf.lines().collect();
    if lines.len() <= max_lines {
        return Ok(());
    }

    let start = lines.len().saturating_sub(max_lines);
    let mut out = lines[start..].join("\n");
    if !out.ends_with('\n') {
        out.push('\n');
    }
    if let Ok(mut wf) = OpenOptions::new().write(true).truncate(true).open(&file) {
        let _ = wf.write_all(out.as_bytes());
    }
    Ok(())
}

// ------------------------
// 初期化処理
// ------------------------

// first_launch_setup
// setup_first_time
// setup_every_launch

// 起動時に初期化を行う
// 流れ　setting.jsonがあるか確認→なければ初期設定ボタンを表示して入力してもらう→保存→setting.jsonを読み込み変数に埋め込む→UpdateCheckeraui2を所定ディレクトリに配置→setting.jsonにexeのパスを追加
// とりあえず　setting.jsonがあるか確認→初期値を入れる(ディレクトリの作成なども)→保存→setting.jsonを読み込み変数に埋め込む→UpdateCheckeraui2を所定ディレクトリに配置→setting.jsonにexeのパスを追加
fn init_app(app: &tauri::AppHandle, max_lines: usize) -> Result<(), String> {
    use std::fs::create_dir_all;
    use std::path::{Path, PathBuf};

    // setting.jsonがあるか確認
    // アプリ用の設定ディレクトリ（ベースパス）を取得
    let base = app.path().app_config_dir().unwrap_or_else(|_| std::env::temp_dir());
    // そのディレクトリを必要なら作成
    let _ = create_dir_all(&base);
    // 設定ファイル settings.json のフルパスを作ります。
    let path = base.join("settings.json");
    // settings.json が存在しなければ初回起動とみなすフラグを立てます。
    let first_run = !path.exists();

    // 初回起動時のみ以下の関数を実行（今回はとりあえずsetting.jsonの作成と基本ダウンロード）
    if first_run {
        // 本来なら初期設定ボタンを表示して入力してもらう
        // ここでapp_dirなどは入力済みとする。
        init_app_first(app, &path)?;
    }

    // パス関係処理をpaths.rsに全部丸投げ
    // paths::init_settings(app);

    // それぞれのパスを取得

    // 実行ファイルのフルパスを取得し、失敗したら空の PathBuf を使います（※失敗時は「空パス」になる）。
    let exe_path = std::env::current_exe().unwrap_or_else(|_| PathBuf::from(""));
    // 実行ファイルのパスを文字列化し、スラッシュ / をバックスラッシュ \ に置換して Windows 風の区切りに揃えます。
    log_info(app, &format!("Executable path: {}", exe_path.display()));
    let exe_str = exe_path.to_string_lossy().replace('/', "\\");
    log_info(app, &format!("Executable path: {}", exe_str));
    // アプリ用の設定ディレクトリ（ベースパス）を取得します（このヘルパーは別定義想定）。
    // let base = app_config_dir(app);

    // 既存の settings.json を読み込んで JSON 値として取得します（無ければデフォルト扱い想定）。
    let mut settings = read_settings_json(&path);
    // 初回起動かどうかを考慮して、必要なパス系のデフォルト値を settings に埋め込みます。
    apply_default_paths(&mut settings, first_run);
    // 実行ファイルパスを元に、settings 内のカタログディレクトリ的な設定値を更新します。
    update_catalog_dir_value(&mut settings, &exe_str);
    // ここまで反映した settings を settings.json に書き出します。
    write_settings_json(&path, &settings);
    // 現在のアプリのバージョン文字列（例: 1.2.3）を取得します。
    let current_ver = app.package_info().version.to_string();
    // settings に保存済みのアプリバージョン文字列を取り出し、無ければ空文字にします。
    let prev_ver = settings.get("appVersion").and_then(|v| v.as_str()).unwrap_or("");
    // 初回起動またはバージョンが変わった場合は、プラグインを配置（更新）すべきだと判断するフラグです。
    let need_place_plugin = first_run || prev_ver != current_ver;
    // プラグイン設置先ディレクトリを設定から取得し、無ければデフォルトのパスを使い、/ を \ に置換して整形します。
    let plugins_dir = settings.get("pluginsDir").and_then(|v| v.as_str()).unwrap_or("C:/ProgramData/aviutl2/Plugin").replace('/', "\\");
    // そのディレクトリ文字列から Path 参照を作ります。
    let plugins_dir_path = Path::new(&plugins_dir);
    // need_place_plugin が真なら、UpdateChecker.aui2 を plugins_dir_path に配置（コピー/更新）する処理を呼び出します。
    ensure_update_checker_plugin(app, plugins_dir_path, need_place_plugin);
    // settings がオブジェクト（JSON の {}）なら可変参照を取得し、
    if let Some(map) = settings.as_object_mut() {
        // appVersion キーに現在のアプリバージョンを保存（上書き）します/
        map.insert("appVersion".to_string(), serde_json::Value::String(current_ver));
    }
    // バージョンを書き込んだ最新の settings をもう一度 settings.json に保存します。
    write_settings_json(&path, &settings);
    prune_log_file(app, max_lines)?;
    // log_info(app, format!("appDirは{}です。", paths::path(Dir::App).to_string_lossy()).as_str());
    // Ok(())
    log_info(app, format!("appDirは{}です。by paths", paths::dirs().catalog_config_dir.to_string_lossy()).as_str());
    Ok(())
}

// 初回起動時に（setting.jsonがない場合）実行する関数
fn init_app_first(app: &tauri::AppHandle, path: &std::path::Path) -> Result<(), String> {
    Ok(())
}

// settings.json を読み込む関数
fn read_settings_json(path: &std::path::Path) -> serde_json::Value {
    use std::fs::File;
    use std::io::Read;

    if let Ok(mut f) = File::open(path) {
        let mut s = String::new();
        if f.read_to_string(&mut s).is_ok() {
            if let Ok(v) = serde_json::from_str::<serde_json::Value>(&s) {
                if v.is_object() {
                    return v;
                }
            }
        }
    }
    serde_json::json!({})
}

// 初回起動時のみ、appDir / pluginsDir / scriptsDir が未設定なら既定値を設定。
fn apply_default_paths(settings: &mut serde_json::Value, first_run: bool) {
    if !first_run {
        return;
    }
    if let Some(map) = settings.as_object_mut() {
        map.entry("appDir").or_insert(serde_json::Value::String(String::from("C:/Program Files/AviUtl2")));
        map.entry("pluginsDir").or_insert(serde_json::Value::String(String::from("C:/ProgramData/aviutl2/Plugin")));
        map.entry("scriptsDir").or_insert(serde_json::Value::String(String::from("C:/ProgramData/aviutl2/Script")));
    }
}

// 設定内の catalogDir を実行ファイルパス（文字列）で上書きします。
fn update_catalog_dir_value(settings: &mut serde_json::Value, exe_str: &str) {
    if let Some(map) = settings.as_object_mut() {
        map.insert("catalogDir".to_string(), serde_json::Value::String(exe_str.to_string()));
    }
}

// 設定オブジェクトを settings.json に Pretty 形式で保存。
fn write_settings_json(path: &std::path::Path, settings: &serde_json::Value) {
    use std::fs::File;
    use std::io::Write;

    if let Ok(mut f) = File::create(path) {
        let json = serde_json::to_string_pretty(settings).unwrap_or_else(|_| String::from("{}"));
        let _ = f.write_all(json.as_bytes());
    }
}

// UpdateChecker.aui2 プラグインを所定ディレクトリに配置（コピー/更新）します。
fn ensure_update_checker_plugin(app: &tauri::AppHandle, plugins_dir: &std::path::Path, force_copy: bool) {
    use std::fs;
    let dst = plugins_dir.join("UpdateChecker.aui2");
    if !force_copy && dst.exists() {
        return;
    }
    if let Some(exe_dir) = std::env::current_exe().ok().and_then(|p| p.parent().map(|p| p.to_path_buf())) {
        let src = exe_dir.join("resources").join("updateChecker.aui2");
        if src.exists() {
            if let Some(parent) = dst.parent() {
                let _ = fs::create_dir_all(parent);
            }
            match fs::copy(&src, &dst) {
                Ok(_) => log_info(app, &format!("Placed UpdateChecker.aui2 to {}", dst.display())),
                Err(e) => log_error(app, &format!("Failed to copy {} to {}: {}", src.display(), dst.display(), e)),
            }
        } else {
            log_error(app, &format!("Source file not found: {}", src.display()));
        }
    }
}

// -----------------------
// 設定ファイルの読み書きと保存
// -----------------------

// アプリケーション設定を読み込み
fn read_settings(app: &tauri::AppHandle) -> Settings {
    use std::fs::File;
    use std::io::Read;
    let mut s = Settings::default();
    let base = app_config_dir(app);
    let path = base.join("settings.json");
    if let Ok(mut f) = File::open(&path) {
        let mut buf = String::new();
        if f.read_to_string(&mut buf).is_ok() {
            if let Ok(v) = serde_json::from_str::<serde_json::Value>(&buf) {
                s.app_dir = v.get("appDir").and_then(|x| x.as_str()).unwrap_or("").to_string();
                s.plugins_dir = v.get("pluginsDir").and_then(|x| x.as_str()).unwrap_or("").to_string();
                s.scripts_dir = v.get("scriptsDir").and_then(|x| x.as_str()).unwrap_or("").to_string();
            }
        }
    }
    if s.app_dir.is_empty() {
        s.app_dir = String::from("C:/Program Files/AviUtl2");
    }
    if s.plugins_dir.is_empty() {
        s.plugins_dir = String::from("C:/ProgramData/aviutl2/Plugin");
    }
    s.app_dir = normalize_saved_path(s.app_dir);
    s.plugins_dir = normalize_saved_path(s.plugins_dir);
    s
}

// 相対パスを絶対パスに変換（検証用）
fn to_absolute_for_check(app: &tauri::AppHandle, p: &str) -> String {
    if p.is_empty() {
        return String::new();
    }
    if is_abs_path(p) {
        return p.replace('/', "\\");
    }
    let base = app_config_dir(app);
    let joined = base.join(p);
    joined.to_string_lossy().replace('/', "\\")
}

// ファイルが存在するかチェック
fn exists_file_abs(p: &str) -> bool {
    match std::fs::metadata(p) {
        Ok(m) => m.is_file(),
        Err(_) => false,
    }
}

// ディレクトリ内のフォルダとファイルをリストアップ
fn list_dir_names(p: &str) -> Result<(Vec<String>, Vec<String>), String> {
    use std::fs::read_dir;
    let mut folders = Vec::new();
    let mut files = Vec::new();
    for ent in read_dir(p).map_err(|e| e.to_string())? {
        match ent {
            Ok(de) => {
                let name = de.file_name().to_string_lossy().to_string();
                match de.file_type() {
                    Ok(ft) => {
                        if ft.is_dir() {
                            folders.push(name);
                        } else {
                            files.push(name);
                        }
                    }
                    Err(_) => files.push(name),
                }
            }
            Err(_) => {}
        }
    }
    Ok((folders, files))
}

// ハッシュキャッシュファイルを読み込み
fn read_hash_cache(app: &tauri::AppHandle) -> std::collections::HashMap<String, serde_json::Value> {
    use std::fs::File;
    use std::io::Read;
    let mut map = std::collections::HashMap::new();
    let path = app_config_dir(app).join("hash-cache.json");
    if let Ok(mut f) = File::open(&path) {
        let mut s = String::new();
        if f.read_to_string(&mut s).is_ok() {
            if let Ok(v) = serde_json::from_str::<serde_json::Value>(&s) {
                if let Some(obj) = v.as_object() {
                    for (k, vv) in obj.iter() {
                        map.insert(k.to_lowercase(), vv.clone());
                    }
                }
            }
        }
    }
    map
}

// ハッシュキャッシュファイルを書き込み
fn write_hash_cache(app: &tauri::AppHandle, cache: &std::collections::HashMap<String, serde_json::Value>) {
    use std::fs::{create_dir_all, File};
    use std::io::Write;
    let base = app_config_dir(app);
    let _ = create_dir_all(&base);
    let path = base.join("hash-cache.json");
    if let Ok(mut f) = File::create(&path) {
        let _ = f.write_all(serde_json::to_string_pretty(cache).unwrap_or_else(|_| "{}".into()).as_bytes());
    }
}

// ファイルの統計情報を取得（更新時刻とサイズ）
fn stat_file(path: &str) -> Option<(u128, u64)> {
    // returns (mtimeMs, size)
    use std::time::UNIX_EPOCH;
    let md = std::fs::metadata(path).ok()?;
    let size = md.len();
    let mtime = md.modified().ok().and_then(|t| t.duration_since(UNIX_EPOCH).ok()).map(|d| d.as_millis())?;
    Some((mtime, size))
}

//-----------------------
// バージョンの確認
//-----------------------

// インストール済みバージョンの検出処理（Rust高速化版）
struct DirectorySnapshot {
    scanned_path: String,
    folders: std::collections::HashSet<String>,
    files: std::collections::HashSet<String>,
}

// 指定ディレクトリ直下の「フォルダ名」と「ファイル名」を収集して DirectorySnapshot にまとめます
fn collect_directory_snapshot(app: &tauri::AppHandle, dir: &str) -> DirectorySnapshot {
    let mut snapshot = DirectorySnapshot {
        scanned_path: String::new(),
        folders: std::collections::HashSet::new(),
        files: std::collections::HashSet::new(),
    };
    let trimmed = dir.trim();
    if trimmed.is_empty() {
        return snapshot;
    }
    match list_dir_names(trimmed) {
        Ok((folders, files)) => {
            snapshot.scanned_path = trimmed.to_string();
            for f in folders {
                snapshot.folders.insert(f);
            }
            for f in files {
                snapshot.files.insert(f);
            }
        }
        Err(e) => {
            log_error(app, &format!("readDir failed path=\"{}\": {}", trimmed, e));
        }
    }
    snapshot
}

// aviutl2.exeのファイル名を定義
pub const AVIUTL_EXE: &str = "aviutl2.exe";

// {appDir} に aviutl2.exe があるかチェック
fn has_app_executable(settings: &Settings) -> bool {
    let base = settings.app_dir.trim().trim_matches('"').trim_end_matches(['/', '\\']);
    if base.is_empty() {
        return false;
    }
    let path = std::path::Path::new(base).join(AVIUTL_EXE);
    match path.to_str() {
        Some(p) => exists_file_abs(p),
        None => false,
    }
}

// アイテム（JSON）ごとに「導入候補か？」を判定します。実在するフォルダ/ファイルやアプリ本体の有無に照らして可能性フィルタをかける段階。
fn detect_candidate_items(list: &[serde_json::Value], has_app_exe: bool, plugins: &DirectorySnapshot, scripts: &DirectorySnapshot) -> Vec<bool> {
    let folders_plugins_lower: std::collections::HashSet<String> = plugins.folders.iter().map(|s| s.to_lowercase()).collect();
    let files_plugins_lower: std::collections::HashSet<String> = plugins.files.iter().map(|s| s.to_lowercase()).collect();
    let folders_scripts_lower: std::collections::HashSet<String> = scripts.folders.iter().map(|s| s.to_lowercase()).collect();
    let files_scripts_lower: std::collections::HashSet<String> = scripts.files.iter().map(|s| s.to_lowercase()).collect();
    let mut is_candidate = vec![false; list.len()];
    for (idx, it) in list.iter().enumerate() {
        let mut ok = false;
        let arr_opt = it.get("versions").and_then(|v| v.as_array()).or_else(|| it.get("version").and_then(|v| v.as_array()));
        if let Some(arr) = arr_opt {
            'outer: for ver in arr {
                let files_opt = ver.get("file").and_then(|v| v.as_array());
                if files_opt.is_none() {
                    continue;
                }
                let files = files_opt.unwrap();
                for f in files {
                    let p = f.get("path").and_then(|v| v.as_str()).unwrap_or("");
                    if p.is_empty() {
                        continue;
                    }
                    let norm = p.replace('\\', "/");
                    if norm.contains("{appDir}") && norm.rsplit('/').next().map(|s| s.to_lowercase()).unwrap_or_default().ends_with(".exe") {
                        if has_app_exe {
                            ok = true;
                            break 'outer;
                        }
                    }
                    if let Some(pos) = norm.find("{pluginsDir}") {
                        let rest = &norm[pos + "{pluginsDir}".len()..];
                        let rest = rest.trim_start_matches('/');
                        let seg: Vec<&str> = rest.split('/').collect();
                        if seg.len() >= 2 {
                            if folders_plugins_lower.contains(&seg[0].to_lowercase()) {
                                ok = true;
                                break 'outer;
                            }
                        } else if seg.len() == 1 && !seg[0].is_empty() {
                            if files_plugins_lower.contains(&seg[0].to_lowercase()) {
                                ok = true;
                                break 'outer;
                            }
                        }
                    }
                    if let Some(pos) = norm.find("{scriptsDir}") {
                        let rest = &norm[pos + "{scriptsDir}".len()..];
                        let rest = rest.trim_start_matches('/');
                        let seg: Vec<&str> = rest.split('/').collect();
                        if seg.len() >= 2 {
                            if folders_scripts_lower.contains(&seg[0].to_lowercase()) {
                                ok = true;
                                break 'outer;
                            }
                        } else if seg.len() == 1 && !seg[0].is_empty() {
                            if files_scripts_lower.contains(&seg[0].to_lowercase()) {
                                ok = true;
                                break 'outer;
                            }
                        }
                    }
                }
            }
        }
        is_candidate[idx] = ok;
    }
    is_candidate
}

// 候補アイテムについて、各バージョンの "file" → "path" をマクロ展開して絶対パスを作り、ハッシュ計算対象のユニーク集合を作る。
fn collect_unique_paths(app: &tauri::AppHandle, list: &[serde_json::Value], settings: &Settings, is_candidate: &[bool]) -> std::collections::HashSet<String> {
    let mut unique_paths = std::collections::HashSet::new();
    for (idx, it) in list.iter().enumerate() {
        if !is_candidate[idx] {
            continue;
        }
        let arr_opt = it.get("versions").and_then(|v| v.as_array()).or_else(|| it.get("version").and_then(|v| v.as_array()));
        if let Some(arr) = arr_opt {
            for ver in arr {
                let ver_str = ver.get("version").and_then(|v| v.as_str()).unwrap_or("");
                if let Some(files) = ver.get("file").and_then(|v| v.as_array()) {
                    for f in files {
                        let raw = f.get("path").and_then(|v| v.as_str()).unwrap_or("");
                        let ctx = std::collections::HashMap::from([
                            ("tmp", ""),
                            ("appDir", settings.app_dir.as_str()),
                            ("pluginsDir", settings.plugins_dir.as_str()),
                            ("scriptsDir", settings.scripts_dir.as_str()),
                            ("id", it.get("id").and_then(|v| v.as_str()).unwrap_or("")),
                            ("version", ver_str),
                            ("download", ""),
                            ("PRODUCT_CODE", ""),
                        ]);
                        let expanded = expand_macros(raw, &ctx).replace('/', "\\");
                        let abs = if is_abs_path(&expanded) { expanded } else { to_absolute_for_check(app, &expanded) };
                        unique_paths.insert(abs);
                    }
                }
            }
        }
    }
    unique_paths
}

// ユニークなパス群に対して**ハッシュ（XXH3_128）**を用意する。ローカルディスクのキャッシュ（mtimeMs と size が一致するか）を優先利用し、必要なものだけ再計算。
fn build_file_hash_cache(app: &tauri::AppHandle, unique_paths: &std::collections::HashSet<String>) -> std::collections::HashMap<String, String> {
    let mut disk_cache = read_hash_cache(app);
    let mut file_hash_cache = std::collections::HashMap::new();
    let mut to_hash = Vec::new();
    for p in unique_paths.iter() {
        let key = p.to_lowercase();
        if let Some((mtime_ms, size)) = stat_file(p) {
            if let Some(v) = disk_cache.get(&key) {
                let hex = v.get("hex").and_then(|x| x.as_str()).unwrap_or("");
                let m = v.get("mtimeMs").and_then(|x| x.as_u64()).or_else(|| v.get("mtimeMs").and_then(|x| x.as_i64().map(|y| y as u64))).unwrap_or(0) as u128;
                let sz = v.get("size").and_then(|x| x.as_u64()).unwrap_or(0);
                if !hex.is_empty() && m == mtime_ms && sz == size {
                    file_hash_cache.insert(key.clone(), hex.to_lowercase());
                    continue;
                }
            }
            to_hash.push(p.clone());
        }
    }
    for p in to_hash.iter() {
        match xxh3_128_hex(p) {
            Ok(hex) => {
                file_hash_cache.insert(p.to_lowercase(), hex);
            }
            Err(e) => {
                log_error(app, &format!("hash error path=\"{}\": {}", p, e));
            }
        }
    }
    for (k, hex) in file_hash_cache.iter() {
        if let Some((mtime_ms, size)) = stat_file(k) {
            disk_cache.insert(k.clone(), serde_json::json!({"hex": hex, "mtimeMs": mtime_ms, "size": size}));
        }
    }
    write_hash_cache(app, &disk_cache);
    file_hash_cache
}

// 各アイテムについて、どのバージョンに一致するかをハッシュ照合で決定します。最新優先で後ろから（降順）チェック。
fn determine_versions(
    app: &tauri::AppHandle,
    list: &[serde_json::Value],
    settings: &Settings,
    is_candidate: &[bool],
    file_hash_cache: &std::collections::HashMap<String, String>,
) -> std::collections::HashMap<String, String> {
    let mut out = std::collections::HashMap::new();
    for (idx, it) in list.iter().enumerate() {
        let id = it.get("id").and_then(|v| v.as_str()).unwrap_or("").to_string();
        if id.is_empty() {
            continue;
        }
        if !is_candidate[idx] {
            out.insert(id.clone(), String::new());
            log_info(app, &format!("detect item done id={} matched=false reason=not-candidate", id));
            continue;
        }
        let mut detected = String::new();
        let mut any_present = false;
        let mut any_mismatch = false;
        let arr_opt = it.get("versions").and_then(|v| v.as_array()).or_else(|| it.get("version").and_then(|v| v.as_array()));
        if let Some(arr) = arr_opt {
            for i in (0..arr.len()).rev() {
                let ver = &arr[i];
                let ver_str = ver.get("version").and_then(|v| v.as_str()).unwrap_or("");
                let files_opt = ver.get("file").and_then(|v| v.as_array());
                if files_opt.is_none() {
                    continue;
                }
                let files = files_opt.unwrap();
                let mut ok = true;
                for f in files {
                    let raw = f.get("path").and_then(|v| v.as_str()).unwrap_or("");
                    let ctx = std::collections::HashMap::from([
                        ("tmp", ""),
                        ("appDir", settings.app_dir.as_str()),
                        ("pluginsDir", settings.plugins_dir.as_str()),
                        ("scriptsDir", settings.scripts_dir.as_str()),
                        ("id", id.as_str()),
                        ("version", ver_str),
                        ("download", ""),
                        ("PRODUCT_CODE", ""),
                    ]);
                    let expanded = expand_macros(raw, &ctx).replace('/', "\\");
                    let abs = if is_abs_path(&expanded) { expanded } else { to_absolute_for_check(app, &expanded) };
                    let key = abs.to_lowercase();
                    let hex = file_hash_cache.get(&key).cloned().unwrap_or_default();
                    let want = f.get("XXH3_128").or_else(|| f.get("xxh3_128")).and_then(|v| v.as_str()).unwrap_or("").to_lowercase();
                    let flipped = if hex.len() == 32 { hex.as_bytes().chunks(2).rev().map(|ch| std::str::from_utf8(ch).unwrap_or("")).collect::<String>() } else { hex.clone() };
                    if !hex.is_empty() {
                        any_present = true;
                    }
                    if !hex.is_empty() && !want.is_empty() && (hex != want && flipped != want) {
                        any_mismatch = true;
                    }
                    if want.is_empty() || (hex != want && flipped != want) {
                        ok = false;
                        break;
                    }
                }
                if ok {
                    detected = ver_str.to_string();
                    break;
                }
            }
        }
        if detected.is_empty() && (any_present || any_mismatch) {
            detected = String::from("???");
        }
        out.insert(id.clone(), detected.clone());
        log_info(app, &format!("detect item done id={} matched={} version={}", id, if detected.is_empty() { "false" } else { "true" }, detected));
    }
    out
}

// 上記すべてをまとめて実行し、「各 id のインストール検出バージョン」を返すエントリポイント。
#[tauri::command]
fn detect_versions_map(app: tauri::AppHandle, items: Vec<serde_json::Value>) -> Result<std::collections::HashMap<String, String>, String> {
    let list = items;
    log_info(&app, &format!("detect map start count={}", list.len()));

    let settings = read_settings(&app);
    let has_app_exe = has_app_executable(&settings);
    let plugins_snapshot = collect_directory_snapshot(&app, settings.plugins_dir.as_str());
    let scripts_snapshot = collect_directory_snapshot(&app, settings.scripts_dir.as_str());

    let folders_plugins_vec: Vec<String> = plugins_snapshot.folders.iter().cloned().collect();
    let files_plugins_vec: Vec<String> = plugins_snapshot.files.iter().cloned().collect();
    let folders_scripts_vec: Vec<String> = scripts_snapshot.folders.iter().cloned().collect();
    let files_scripts_vec: Vec<String> = scripts_snapshot.files.iter().cloned().collect();
    log_info(
        &app,
        &format!(
            "scan appExe={} pluginsDir=\"{}\" pFolders=[{}] pFiles=[{}] scriptsDir=\"{}\" sFolders=[{}] sFiles=[{}]",
            has_app_exe,
            plugins_snapshot.scanned_path,
            folders_plugins_vec.join(","),
            files_plugins_vec.join(","),
            scripts_snapshot.scanned_path,
            folders_scripts_vec.join(","),
            files_scripts_vec.join(","),
        ),
    );

    let is_candidate = detect_candidate_items(&list, has_app_exe, &plugins_snapshot, &scripts_snapshot);
    let unique_paths = collect_unique_paths(&app, &list, &settings, &is_candidate);
    let file_hash_cache = build_file_hash_cache(&app, &unique_paths);
    let out = determine_versions(&app, &list, &settings, &is_candidate, &file_hash_cache);

    Ok(out)
}

// -----------------------
// インストール済みマップ管理（AppConfig/installed.json）
// -----------------------

// インストール済みファイルのパスを取得
fn installed_file_path(app: &tauri::AppHandle) -> std::path::PathBuf {
    app_config_dir(app).join("installed.json")
}

// インストール済みマップをファイルから読み込み
fn read_installed_map(app: &tauri::AppHandle) -> std::collections::HashMap<String, String> {
    use std::fs::File;
    use std::io::Read;
    let mut map = std::collections::HashMap::new();
    let p = installed_file_path(app);
    if let Ok(mut f) = File::open(&p) {
        let mut s = String::new();
        if f.read_to_string(&mut s).is_ok() {
            if let Ok(v) = serde_json::from_str::<serde_json::Value>(&s) {
                if let Some(obj) = v.as_object() {
                    for (k, vv) in obj.iter() {
                        if let Some(val) = vv.as_str() {
                            map.insert(k.clone(), val.to_string());
                        }
                    }
                }
            }
        }
    }
    map
}

// インストール済みマップをファイルに書き込み
fn write_installed_map(app: &tauri::AppHandle, map: &std::collections::HashMap<String, String>) -> Result<(), String> {
    use std::fs::{create_dir_all, File};
    use std::io::Write;
    let base = app_config_dir(app);
    let _ = create_dir_all(&base);
    let p = installed_file_path(app);
    let mut f = File::create(&p).map_err(|e| e.to_string())?;
    f.write_all(serde_json::to_string_pretty(map).unwrap().as_bytes()).map_err(|e| e.to_string())?;
    Ok(())
}

// インストール済みマップ取得コマンド
#[tauri::command]
fn get_installed_map_cmd(app: tauri::AppHandle) -> Result<std::collections::HashMap<String, String>, String> {
    Ok(read_installed_map(&app))
}

// インストール済みIDを追加するコマンド
#[tauri::command]
fn add_installed_id_cmd(app: tauri::AppHandle, id: String, version: Option<String>) -> Result<std::collections::HashMap<String, String>, String> {
    let mut map = read_installed_map(&app);
    map.insert(id, version.unwrap_or_default());
    write_installed_map(&app, &map)?;
    Ok(map)
}

// インストール済みIDを削除するコマンド
#[tauri::command]
fn remove_installed_id_cmd(app: tauri::AppHandle, id: String) -> Result<std::collections::HashMap<String, String>, String> {
    let mut map = read_installed_map(&app);
    map.remove(&id);
    write_installed_map(&app, &map)?;
    Ok(map)
}

// -----------------------
// Tauriアプリケーションのセットアップと起動
// -----------------------

// Tauriアプリケーションのメインエントリーポイント
pub fn run() {
    tauri::Builder::default()
        // フロントエンドで使用される Tauri v2 プラグインを登録
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_http::init())
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_process::init())
        .plugin(tauri_plugin_updater::Builder::new().build())
        .setup(|app| {
            // 起動時に app.log を最新 1000 行に削減
            paths::init_settings(&app.handle())?;
            let _ = init_app(&app.handle(), 1000);
            // paths::init_settings(&app.handle())?;
            // init_app()
            // // 重い処理は起動後にバックグラウンドへ
            // let handle = app.handle().clone();
            // tauri::async_runtime::spawn(async move {
            //     if let Err(e) = prune_app_log_async(&handle, 1000).await {
            //         log::warn!("prune_app_log failed: {e}");
            //     }
            // });
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            set_catalog_index,
            query_catalog_index,
            extract_zip,
            detect_versions_map,
            log_cmd,
            get_installed_map_cmd,
            add_installed_id_cmd,
            remove_installed_id_cmd,
            drive_download_to_file,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
