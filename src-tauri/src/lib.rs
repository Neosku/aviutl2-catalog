// use crate::paths::Dir;
use once_cell::sync::Lazy;
use percent_encoding::percent_decode_str;
use std::fs;
use std::io::{self};
use std::path::{Path, PathBuf};
use std::sync::RwLock;
use tauri::{webview::PageLoadEvent, Emitter, Manager, WebviewUrl, WebviewWindowBuilder};
use url::Url;
use walkdir::WalkDir;

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

fn drive_filename_from_headers(headers: &reqwest::header::HeaderMap) -> Option<String> {
    let raw = headers.get(reqwest::header::CONTENT_DISPOSITION)?;
    let value = String::from_utf8_lossy(raw.as_bytes());

    for part in value.split(';') {
        let part = part.trim();
        if let Some(name) = part.strip_prefix("filename*=") {
            let encoded = name.trim().trim_matches('"');
            let payload = encoded.split_once("''").map(|(_, v)| v).unwrap_or(encoded);
            let decoded = percent_decode_str(payload).decode_utf8_lossy();
            let cleaned = sanitize_filename(&decoded);
            return Some(cleaned);
        }
    }

    for part in value.split(';') {
        let part = part.trim();
        if let Some(name) = part.strip_prefix("filename=") {
            let cleaned = sanitize_filename(name.trim().trim_matches('"'));
            return Some(cleaned);
        }
    }

    None
}

async fn drive_fetch_response(file_id: &str) -> Result<reqwest::Response, DriveError> {
    let url = format!("https://drive.google.com/uc?export=download&id={}", file_id);
    let client = reqwest::Client::builder().user_agent("AviUtl2Catalog").build().map_err(|e| DriveError::Net(format!("client build failed: {}", e)))?;

    let res = client.get(&url).send().await.map_err(|e| DriveError::Net(e.to_string()))?;
    if res.status().is_success() {
        return Ok(res);
    }
    let status = res.status();
    let text = res.text().await.unwrap_or_default();
    let snippet: String = text.chars().take(500).collect();
    if snippet.trim().is_empty() {
        Err(DriveError::Http(format!("{} {}", status, "failed to download file from Google Drive")))
    } else {
        Err(DriveError::Http(format!("{} {}", status, snippet)))
    }
}

#[tauri::command]
async fn drive_download_to_file(window: tauri::Window, file_id: String, dest_path: String) -> Result<(), DriveError> {
    use std::fs::{create_dir_all, OpenOptions};
    use std::io::Write;

    let app = window.app_handle();
    let mut res = match drive_fetch_response(&file_id).await {
        Ok(v) => v,
        Err(e) => {
            log_error(&app, &format!("failed to fetch drive file (id={}): {}", file_id, e));
            return Err(e);
        }
    };

    let dest_abs = resolve_rel_to_app_config(&app, &dest_path);
    let looks_dir = dest_path.ends_with('/') || dest_path.ends_with('\\') || dest_abs.is_dir();
    let is_placeholder = dest_abs.file_name().and_then(|s| s.to_str()).map(|s| s.eq_ignore_ascii_case("download.bin") || s == file_id).unwrap_or(true);
    let drive_name = drive_filename_from_headers(res.headers());

    let final_dest = if looks_dir || is_placeholder {
        let drive_name = drive_name.ok_or_else(|| DriveError::Http("missing filename in Google Drive response".to_string()))?;
        if looks_dir {
            dest_abs.join(drive_name)
        } else {
            dest_abs.parent().map(|p| p.join(drive_name)).unwrap_or(dest_abs.clone())
        }
    } else {
        dest_abs.clone()
    };
    if let Some(parent) = final_dest.parent() {
        let _ = create_dir_all(parent);
    }

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

#[tauri::command]
async fn download_file_to_path(window: tauri::Window, url: String, dest_path: String, task_id: Option<String>) -> Result<String, String> {
    use std::fs::{create_dir_all, OpenOptions};
    use std::io::Write;

    if !url.trim_start().to_ascii_lowercase().starts_with("https://") {
        return Err("Only https:// is permitted".to_string());
    }
    if dest_path.trim().is_empty() {
        return Err("dest_path must not be empty".to_string());
    }

    let app = window.app_handle();
    let task_id = task_id.unwrap_or_else(|| format!("download-{}", chrono::Utc::now().timestamp_micros()));
    let dest_dir = resolve_rel_to_app_config(&app, &dest_path);
    if let Err(e) = create_dir_all(&dest_dir) {
        let msg = format!("failed to prepare destination directory: {}", e);
        let _ = window.emit("download:error", serde_json::json!({ "taskId": task_id, "message": msg }));
        return Err(msg);
    }

    let parsed_url = Url::parse(&url).map_err(|e| {
        let msg = format!("invalid url: {}", e);
        let _ = window.emit("download:error", serde_json::json!({ "taskId": task_id, "message": msg }));
        msg
    })?;
    let file_name_raw = parsed_url
        .path_segments()
        .and_then(|segments| segments.filter(|s| !s.is_empty()).last().map(|s| s.to_string()))
        .filter(|s| !s.is_empty())
        .unwrap_or_else(|| "download.bin".to_string());
    let file_name = percent_decode_str(&file_name_raw).decode_utf8_lossy().to_string();
    let final_name = sanitize_filename(&file_name);
    let final_path = dest_dir.join(final_name);

    let client = reqwest::Client::builder().user_agent("AviUtl2Catalog").build().map_err(|e| {
        let msg = format!("failed to build http client: {}", e);
        let _ = window.emit("download:error", serde_json::json!({ "taskId": task_id, "message": msg }));
        msg
    })?;

    let mut response = client.get(&url).send().await.map_err(|e| {
        let msg = format!("network error: {}", e);
        let _ = window.emit("download:error", serde_json::json!({ "taskId": task_id, "message": msg }));
        log_error(&app, &format!("download failed (url={}): {}", url, e));
        msg
    })?;

    let status = response.status();
    if !status.is_success() {
        let text = response.text().await.unwrap_or_default();
        let body_snippet: String = if text.len() > 500 { text[..500].to_string() } else { text };
        let msg = if body_snippet.is_empty() { format!("HTTP error: {}", status) } else { format!("HTTP error: {}: {}", status, body_snippet) };
        let _ = window.emit("download:error", serde_json::json!({ "taskId": task_id, "message": msg }));
        log_error(&app, &format!("download failed (url={}): {}", url, msg));
        return Err(msg);
    }

    let total_opt = response.content_length();
    let mut file = OpenOptions::new().create(true).truncate(true).write(true).open(&final_path).map_err(|e| {
        let msg = format!("failed to open destination file: {}", e);
        let _ = window.emit("download:error", serde_json::json!({ "taskId": task_id, "message": msg }));
        log_error(&app, &format!("download failed (url={}): {}", url, msg));
        msg
    })?;

    let mut written: u64 = 0;
    while let Some(chunk) = response.chunk().await.map_err(|e| {
        let msg = format!("read error: {}", e);
        let _ = window.emit("download:error", serde_json::json!({ "taskId": task_id, "message": msg }));
        log_error(&app, &format!("download failed (url={}): {}", url, msg));
        msg
    })? {
        file.write_all(&chunk).map_err(|e| {
            let msg = format!("write error: {}", e);
            let _ = window.emit("download:error", serde_json::json!({ "taskId": task_id, "message": msg }));
            log_error(&app, &format!("download failed (url={}): {}", url, msg));
            msg
        })?;
        written += chunk.len() as u64;
        let _ = window.emit(
            "download:progress",
            serde_json::json!({
                "taskId": task_id,
                "read": written,
                "total": total_opt,
            }),
        );
    }

    let final_path_str = final_path.to_string_lossy().to_string();
    let _ = window.emit(
        "download:done",
        serde_json::json!({
            "taskId": task_id,
            "path": final_path_str,
        }),
    );

    Ok(final_path_str)
}

// -------------------------
// BOOTH認証用ウィンドウ管理とダウンロード処理
// -------------------------

// BOOTHのログイン系パス判定
fn is_booth_login_path(path: &str) -> bool {
    let p = path.trim_end_matches('/');
    p.starts_with("/users/sign_in") || p.starts_with("/users/sign_in_by_password") || p.starts_with("/users/password/new") || p.starts_with("/users/unlock/new")
}

// booth.pm かつログイン画面系のURLかの判定
fn is_booth_login_url(url: &Url) -> bool {
    let host = url.host_str().unwrap_or("");
    host.ends_with("booth.pm") && is_booth_login_path(url.path())
}

// booth.pm かつログイン画面系以外のURLかの判定
fn is_booth_logged_in_url(url: &Url) -> bool {
    let host = url.host_str().unwrap_or("");
    host.ends_with("booth.pm") && !is_booth_login_path(url.path())
}

// BOOTH認証用ウィンドウの管理
#[tauri::command]
async fn ensure_booth_auth_window(app: tauri::AppHandle) -> Result<(), String> {
    let app_handle = app.clone();
    // WebView2 の既知のデッドロック回避のため別スレッドで作成
    tauri::async_runtime::spawn_blocking(move || {
        // BOOTHログインURLとデータディレクトリを準備
        let login_url = Url::parse("https://booth.pm/users/sign_in").map_err(|e| e.to_string())?;
        let data_dir = app_handle.path().app_data_dir().map_err(|e| e.to_string())?.join("booth-auth");
        // プロファイルを固定してログイン状態を維持
        let _ = std::fs::create_dir_all(&data_dir);
        // 既存ウィンドウがあれば再利用
        if let Some(window) = app_handle.get_webview_window("booth-auth") {
            let should_navigate = match window.url() {
                Ok(current_url) => {
                    let is_blank = current_url.as_str().eq_ignore_ascii_case("about:blank");
                    let is_booth = current_url.host_str().map(|h| h.ends_with("booth.pm")).unwrap_or(false);
                    is_blank || !is_booth
                }
                Err(_) => true,
            };
            if let Ok(current_url) = window.url() {
                if is_booth_logged_in_url(&current_url) {
                    // 既にログイン済みなら通知して隠す
                    let _ = app_handle.emit("booth-auth:login-complete", serde_json::json!({ "url": current_url.as_str() }));
                    let _ = window.hide();
                    return Ok(());
                }
            }
            let _ = window.hide();
            if should_navigate {
                let _ = window.navigate(login_url.clone());
            }
            if let Ok(current_url) = window.url() {
                if is_booth_login_url(&current_url) {
                    // ログイン画面のみ表示
                    let _ = window.show();
                    let _ = window.set_focus();
                }
            }
            return Ok(());
        }
        // 新規ウィンドウを作成
        let app_for_event = app_handle.clone();
        let mut builder = WebviewWindowBuilder::new(&app_handle, "booth-auth", WebviewUrl::External(login_url))
            .title("BOOTH ログイン")
            .inner_size(900.0, 720.0)
            .resizable(true)
            .visible(false)
            .data_directory(data_dir)
            .on_page_load(move |window, payload| {
                if payload.event() != PageLoadEvent::Finished {
                    return;
                }
                let url = payload.url();
                if is_booth_logged_in_url(url) {
                    // ログイン完了を検知したら通知して非表示
                    let _ = app_for_event.emit("booth-auth:login-complete", serde_json::json!({ "url": url.as_str() }));
                    let _ = window.hide();
                    return;
                }
                if is_booth_login_url(url) {
                    // ログイン画面のみ表示
                    let _ = window.show();
                    let _ = window.set_focus();
                }
            });

        #[cfg(target_os = "windows")]
        {
            builder = builder.initialization_script(
                r#"
                window.addEventListener('keydown', (e) => {
                    if (e.ctrlKey && !e.altKey && !e.shiftKey && !e.metaKey) {
                        if (e.code === 'KeyP' || e.code === 'KeyJ') {
                            e.preventDefault();
                        }
                    }
                }, true);
                "#,
            );
        }

        let _window = builder.build().map_err(|e| e.to_string())?;

        Ok(())
    })
    .await
    .map_err(|e| e.to_string())?
}

// BOOTH認証用ウィンドウを閉じる
#[tauri::command]
fn close_booth_auth_window(app: tauri::AppHandle) -> Result<(), String> {
    if let Some(window) = app.get_webview_window("booth-auth") {
        // セッション破棄ではなくウィンドウクローズのみ
        let _ = window.close();
    }
    Ok(())
}

// ファイルダウンロード（BOOTH認証セッション対応版）
#[tauri::command]
async fn download_file_to_path_booth(
    window: tauri::Window,
    url: String,
    dest_path: String,
    task_id: Option<String>,
    session_window_label: Option<String>,
) -> Result<String, String> {
    use reqwest::header::{CONTENT_DISPOSITION, CONTENT_TYPE, COOKIE};
    use std::fs::{create_dir_all, OpenOptions};
    use std::io::Write;

    if !url.trim_start().to_ascii_lowercase().starts_with("https://") {
        return Err("Only https:// is permitted".to_string());
    }
    if dest_path.trim().is_empty() {
        return Err("dest_path must not be empty".to_string());
    }

    let app = window.app_handle();
    let task_id = task_id.unwrap_or_else(|| format!("download-{}", chrono::Utc::now().timestamp_micros()));
    let dest_dir = resolve_rel_to_app_config(&app, &dest_path);
    if let Err(e) = create_dir_all(&dest_dir) {
        let msg = format!("failed to prepare destination directory: {}", e);
        let _ = window.emit("download:error", serde_json::json!({ "taskId": task_id, "message": msg }));
        return Err(msg);
    }

    let parsed_url = Url::parse(&url).map_err(|e| {
        let msg = format!("invalid url: {}", e);
        let _ = window.emit("download:error", serde_json::json!({ "taskId": task_id, "message": msg }));
        msg
    })?;

    let session_label = session_window_label.unwrap_or_else(|| "booth-auth".to_string()).trim().to_string();
    let session_label = if session_label.is_empty() { "booth-auth".to_string() } else { session_label };
    let session_window = match app.get_webview_window(&session_label) {
        Some(w) => w,
        None => {
            let msg = "AUTH_WINDOW_MISSING".to_string();
            let _ = window.emit("download:error", serde_json::json!({ "taskId": task_id, "message": msg }));
            return Err(msg);
        }
    };

    // Webview の Cookie を Rust 側リクエストに引き継ぐ
    let cookies = session_window.cookies_for_url(parsed_url.clone()).map_err(|e| {
        let msg = format!("AUTH_COOKIE_FETCH_FAILED: {}", e);
        let _ = window.emit("download:error", serde_json::json!({ "taskId": task_id, "message": msg }));
        msg
    })?;
    let cookie_header = cookies.iter().map(|c| format!("{}={}", c.name(), c.value())).collect::<Vec<_>>().join("; ");

    // URL末尾から推定したファイル名を安全化
    let file_name_raw = parsed_url
        .path_segments()
        .and_then(|segments| segments.filter(|s| !s.is_empty()).last().map(|s| s.to_string()))
        .filter(|s| !s.is_empty())
        .unwrap_or_else(|| "download.bin".to_string());
    let file_name = percent_decode_str(&file_name_raw).decode_utf8_lossy().to_string();
    let final_name = sanitize_filename(&file_name);
    let final_path = dest_dir.join(final_name);

    let client = reqwest::Client::builder().user_agent("AviUtl2Catalog").build().map_err(|e| {
        let msg = format!("failed to build http client: {}", e);
        let _ = window.emit("download:error", serde_json::json!({ "taskId": task_id, "message": msg }));
        msg
    })?;

    let mut req = client.get(&url);
    if !cookie_header.is_empty() {
        req = req.header(COOKIE, cookie_header);
    }

    let mut response = req.send().await.map_err(|e| {
        let msg = format!("network error: {}", e);
        let _ = window.emit("download:error", serde_json::json!({ "taskId": task_id, "message": msg }));
        log_error(&app, &format!("booth download failed (url={}): {}", url, e));
        msg
    })?;

    let status = response.status();
    if !status.is_success() {
        let msg = format!("HTTP_ERROR:{} {}", status.as_u16(), status);
        let _ = window.emit("download:error", serde_json::json!({ "taskId": task_id, "message": msg }));
        log_error(&app, &format!("booth download failed (url={}): {}", url, msg));
        return Err(msg);
    }

    let final_url = response.url().clone();
    // 未ログインのリダイレクトは保存しない
    if is_booth_login_url(&final_url) {
        let msg = "AUTH_REQUIRED".to_string();
        let _ = window.emit("download:error", serde_json::json!({ "taskId": task_id, "message": msg }));
        return Err(msg);
    }

    let content_type = response.headers().get(CONTENT_TYPE).and_then(|v| v.to_str().ok()).unwrap_or("").to_ascii_lowercase();
    let content_disposition = response.headers().get(CONTENT_DISPOSITION);
    // HTML かつ Content-Disposition が無い場合はログイン画面とみなす
    if content_type.contains("text/html") && content_disposition.is_none() {
        let msg = "AUTH_REQUIRED".to_string();
        let _ = window.emit("download:error", serde_json::json!({ "taskId": task_id, "message": msg }));
        return Err(msg);
    }

    // 認証チェック後にのみファイルを作成
    let total_opt = response.content_length();
    let mut file = OpenOptions::new().create(true).truncate(true).write(true).open(&final_path).map_err(|e| {
        let msg = format!("failed to open destination file: {}", e);
        let _ = window.emit("download:error", serde_json::json!({ "taskId": task_id, "message": msg }));
        log_error(&app, &format!("booth download failed (url={}): {}", url, msg));
        msg
    })?;

    let mut written: u64 = 0;
    while let Some(chunk) = response.chunk().await.map_err(|e| {
        let msg = format!("read error: {}", e);
        let _ = window.emit("download:error", serde_json::json!({ "taskId": task_id, "message": msg }));
        log_error(&app, &format!("booth download failed (url={}): {}", url, msg));
        msg
    })? {
        file.write_all(&chunk).map_err(|e| {
            let msg = format!("write error: {}", e);
            let _ = window.emit("download:error", serde_json::json!({ "taskId": task_id, "message": msg }));
            log_error(&app, &format!("booth download failed (url={}): {}", url, msg));
            msg
        })?;
        written += chunk.len() as u64;
        let _ = window.emit(
            "download:progress",
            serde_json::json!({
                "taskId": task_id,
                "read": written,
                "total": total_opt,
            }),
        );
    }

    let final_path_str = final_path.to_string_lossy().to_string();
    let _ = window.emit(
        "download:done",
        serde_json::json!({
            "taskId": task_id,
            "path": final_path_str,
        }),
    );

    Ok(final_path_str)
}

// -------------------------
// ハッシュ計算 (OK)
// -------------------------

// ファイルのハッシュ(xxh3-128)を計算
use xxhash_rust::xxh3::xxh3_128;

pub fn xxh3_128_hex<P: AsRef<Path>>(path: P) -> Result<String, String> {
    let buf = fs::read(path).map_err(|e| format!("open/read error: {}", e))?;
    let h = xxh3_128(&buf);
    Ok(format!("{:032x}", h))
}

#[tauri::command]
fn calc_xxh3_hex(path: String) -> Result<String, String> {
    xxh3_128_hex(path)
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
use std::fs::File;
use zip::read::ZipArchive;
/// ZIPファイルを解凍する
#[tauri::command]
fn extract_zip(_app: tauri::AppHandle, zip_path: String, dest_path: String) -> Result<(), String> {
    let file = File::open(&zip_path).map_err(|e| format!("open zip error: {}", e))?;
    let mut archive = ZipArchive::new(file).map_err(|e| format!("zip open error: {}", e))?;
    archive.extract(Path::new(&dest_path)).map_err(|e| format!("extract error: {}", e))?;
    Ok(())
}
// -----------------------
// 7zファイル解凍
// -----------------------
use memchr::memmem::Finder;
use memmap2::MmapOptions;
use sevenz_rust2::{decompress_with_extract_fn_and_password, default_entry_extract_fn, Password};
use std::io::Cursor;

// 7z SFX（自己解凍形式）ファイルを展開
#[tauri::command]
async fn extract_7z_sfx(_: tauri::AppHandle, sfx_path: String, dest_path: String) -> Result<(), String> {
    tauri::async_runtime::spawn_blocking(move || -> Result<(), String> {
        const SIGNATURE: &[u8] = b"\x37\x7A\xBC\xAF\x27\x1C"; // // 7z ファイルのシグネチャ
        let file = File::open(Path::new(&sfx_path)).map_err(|e| format!("open sfx error: {e}"))?; // SFX ファイルを開く
        let mmap = unsafe { MmapOptions::new().map(&file) }.map_err(|e| format!("mmap error: {e}"))?; // ファイルをメモリマップする（高速読み取りのため）
        let offset = Finder::new(SIGNATURE).find(&mmap).ok_or_else(|| "7z signature not found in SFX binary".to_string())?; // SFX バイナリ内から 7z シグネチャ位置を検索する
        let cursor = Cursor::new(&mmap[offset..]); // シグネチャ位置からカーソルを作成（7z データ部分を読み込む）
        decompress_with_extract_fn_and_password(cursor, Path::new(&dest_path), Password::empty(), default_entry_extract_fn).map_err(|e| format!("7z decompress error: {e}"))?; // 7z データを展開する（パスワード無しで解凍）
        Ok(())
    })
    .await
    .map_err(|e| format!("task join error: {e}"))?
}

// -----------------------
// auo_setup 自動実行
// -----------------------

use std::{
    thread,
    time::{Duration, Instant},
};
use tauri::AppHandle;

use windows::{
    core::{w, PCWSTR},
    Win32::Foundation::{HWND, LPARAM, WPARAM},
    Win32::UI::WindowsAndMessaging::{
        FindWindowExW, GetClassNameW, GetDlgItem, GetTopWindow, GetWindow, GetWindowThreadProcessId, PostMessageW, SendMessageW, GW_HWNDNEXT, WM_CLOSE, WM_GETTEXT,
        WM_GETTEXTLENGTH,
    },
};
// 指定したクラス名とプロセスIDに一致するウィンドウを探す
fn wait_find_window_by_class_and_pid(class_name: &str, pid: u32, timeout: Duration) -> Option<HWND> {
    let deadline = Instant::now() + timeout;
    while Instant::now() < deadline {
        unsafe {
            let mut cur = GetTopWindow(None).ok();
            while let Some(hwnd) = cur {
                let mut buf = [0u16; 256];
                if let len @ 1..=256 = GetClassNameW(hwnd, &mut buf) as usize {
                    if String::from_utf16_lossy(&buf[..len]) == class_name {
                        let mut win_pid = 0u32;
                        GetWindowThreadProcessId(hwnd, Some(&mut win_pid));
                        if win_pid == pid {
                            return Some(hwnd);
                        }
                    }
                }
                cur = GetWindow(hwnd, GW_HWNDNEXT).ok();
            }
        }
        thread::sleep(Duration::from_millis(300));
    }
    None
}
// EDIT コントロールからたテキストを読み出し、指定キーワードが含まれるか判定
fn drain_new_text_from_edit_and_check(hwnd_edit: HWND, last_len_u16: &mut usize, keyword: &str) -> bool {
    const OVERLAP: usize = 128;
    unsafe {
        let len = SendMessageW(hwnd_edit, WM_GETTEXTLENGTH, None, None).0 as usize;
        if len < *last_len_u16 {
            return false;
        }
        let mut buf = vec![0u16; len + 1];
        let _ = SendMessageW(hwnd_edit, WM_GETTEXT, Some(WPARAM(buf.len())), Some(LPARAM(buf.as_mut_ptr() as isize)));
        if let Some(z) = buf.iter().position(|&c| c == 0) {
            buf.truncate(z);
        }
        let start = last_len_u16.saturating_sub(OVERLAP);
        let matched = !keyword.is_empty() && String::from_utf16_lossy(&buf[start..]).contains(keyword);
        *last_len_u16 = len;
        matched
    }
}
// auo_setupを実行　ログを監視し、完了メッセージ検出でウィンドウを閉じる
pub fn run_auo_setup_impl(_app: AppHandle, exe_path: PathBuf, args: Option<Vec<String>>) -> Result<i32, String> {
    let mut cmd = std::process::Command::new(&exe_path);
    if let Some(a) = &args {
        cmd.args(a);
    }
    let mut child = cmd.spawn().map_err(|e| format!("Failed to start '{}': {e}", exe_path.display()))?;
    let pid = child.id();
    let hwnd_dialog = wait_find_window_by_class_and_pid("AUO_SETUP", pid, Duration::from_secs(30)).ok_or_else(|| "Timed out waiting for AUO_SETUP window".to_string())?;
    let hwnd_edit = unsafe {
        GetDlgItem(Some(hwnd_dialog), 100)
            .ok()
            .filter(|h| !h.0.is_null())
            .or_else(|| FindWindowExW(Some(hwnd_dialog), None, w!("EDIT"), PCWSTR::null()).ok())
            .unwrap_or(HWND(std::ptr::null_mut()))
    };
    if hwnd_edit.0.is_null() {
        return Err("EDIT control not found in AUO_SETUP window".into());
    }
    let keyword = "を使用する準備が完了しました。";
    let mut last_len_u16 = 0usize;
    let mut close_sent = false;
    loop {
        if !close_sent && drain_new_text_from_edit_and_check(hwnd_edit, &mut last_len_u16, keyword) {
            unsafe {
                let _ = PostMessageW(Some(hwnd_dialog), WM_CLOSE, WPARAM(0), LPARAM(0));
            }
            close_sent = true;
        }
        thread::sleep(Duration::from_millis(500));

        if let Some(status) = child.try_wait().map_err(|e| format!("try_wait failed: {e}"))? {
            let _ = drain_new_text_from_edit_and_check(hwnd_edit, &mut last_len_u16, "");
            return Ok(status.code().unwrap_or_default());
        }
    }
}
// run_auo_setup_implを呼び出し(実行パスを正規化、引数を構築)
#[tauri::command]
async fn run_auo_setup(app: AppHandle, exe_path: String) -> Result<i32, String> {
    let exe_path = PathBuf::from(exe_path);
    let exe_path = fs::canonicalize(exe_path).map_err(|e| e.to_string())?;
    let settings = {
        let config_dir = app.path().app_config_dir().map_err(|e| e.to_string())?;
        let settings_path = config_dir.join("settings.json");
        crate::paths::Settings::load_from_file(&settings_path)
    };
    let mut args_vec = Vec::new();
    if settings.is_portable_mode {
        log_info(&app, "Running in portable mode");
        let core_installed = read_installed_map(&app).get("Kenkun.AviUtlExEdit2").map(|s| !s.trim().is_empty()).unwrap_or(false);
        if !core_installed {
            let msg = String::from("Kenkun.AviUtlExEdit2 がインストールされていません。インストール後に再度実行してください。");
            log_error(&app, &msg);
            return Err(msg);
        }
        if settings.aviutl2_root.as_os_str().is_empty() {
            let msg = String::from("settings.json に AviUtl2 のルートフォルダが設定されていません。");
            log_error(&app, &msg);
            return Err(msg);
        }
        let root_arg = settings.aviutl2_root.to_string_lossy().to_string();
        args_vec.push("-aviutldir".to_string());
        args_vec.push(root_arg);
    } else {
        log_info(&app, "Running in standard mode");
        args_vec.push("-aviutldir-default".to_string());
    }
    let args = if args_vec.is_empty() { None } else { Some(args_vec) };
    let app_for_task = app.clone();
    tauri::async_runtime::spawn_blocking(move || run_auo_setup_impl(app_for_task, exe_path, args)).await.map_err(|e| e.to_string())?
}

// -----------------------
// インストール済みバージョン検出
// -----------------------

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
    use std::fs;
    let file = app_config_dir(app).join("logs/app.log");
    if !file.exists() {
        return Ok(());
    }
    let text = match fs::read_to_string(&file) {
        Ok(t) => t,
        Err(_) => return Ok(()), // 読めなければ何もしない
    };
    let lines: Vec<&str> = text.lines().collect();
    if lines.len() <= max_lines {
        return Ok(());
    }
    let start = lines.len() - max_lines;
    let _ = fs::write(&file, lines[start..].join("\n") + "\n");
    Ok(())
}

// ------------------------
// 初期化処理
// ------------------------

// 起動時に初期化を行う(すでに移行済み)
// 流れ　setting.jsonがあるか確認→なければ初期設定ボタンを表示して入力してもらう→保存→setting.jsonを読み込み変数に埋め込む→UpdateCheckeraui2を所定ディレクトリに配置→setting.jsonにexeのパスを追加
// とりあえず　setting.jsonがあるか確認→初期値を入れる(ディレクトリの作成なども)→保存→setting.jsonを読み込み変数に埋め込む→UpdateCheckeraui2を所定ディレクトリに配置→setting.jsonにexeのパスを追加
fn init_app(app: &tauri::AppHandle) -> Result<(), String> {
    let max_lines = 1000; // ログファイルの最大行数
                          // use std::fs::create_dir_all;
                          // use std::path::{Path, PathBuf};

    // 起動時初期化(これを最初にうつしたほうがいいかも)
    // 流れ：setting.jsonからファイルを読み込み→app_dirがない場合は初期設定→パスを登録→現在のバージョンを取得し比較→updateCheckerの移動の可否を決定
    // paths::init_settings(&app).unwrap_or_else(|e| {
    //     log_error(app, &format!("Failed to initialize settings: {}", e));
    // });
    prune_log_file(app, max_lines)?;
    Ok(())
}

// UpdateChecker.aui2 プラグインをplugin_dirに配置（権限不足の場合のフォールバック改善必要）
fn install_update_checker_plugin(app: &tauri::AppHandle, plugin_dir: &std::path::Path, force_copy: bool) {
    use std::fs;
    let dst = plugin_dir.join("UpdateChecker.aui2");
    if !force_copy && dst.exists() {
        return;
    }
    let src = paths::dirs().catalog_exe_dir.join("resources").join("updateChecker.aui2");
    if src.exists() {
        // 親ディレクトリを作成
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

// -----------------------
// 設定ファイルの読み書きと保存
// -----------------------

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
                        map.insert(k.clone(), vv.clone());
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
    let mtime = md.modified().ok()?.duration_since(UNIX_EPOCH).ok()?.as_millis();
    Some((mtime, size))
}

//-----------------------
// バージョン検証
//-----------------------

// マクロ展開処理（{appDir}、{pluginsDir}などのプレースホルダーを実際のパスに置換）
#[tauri::command]
fn expand_macros(raw_path: &str) -> String {
    let dirs = paths::dirs();
    let replacements = [
        ("{appDir}", dirs.aviutl2_root.to_string_lossy()),
        ("{pluginsDir}", dirs.plugin_dir.to_string_lossy()),
        ("{scriptsDir}", dirs.script_dir.to_string_lossy()),
        ("{dataDir}", dirs.aviutl2_data.to_string_lossy()),
    ];

    let mut out = raw_path.to_owned();
    for (key, val) in replacements {
        out = out.replace(key, &val);
    }
    out
}

// index.jsonの各アイテムから、パッケージのパスの集合を作成
fn collect_unique_paths(app: &tauri::AppHandle, list: &[serde_json::Value]) -> Result<std::collections::HashSet<String>, String> {
    log_info(app, "Collecting unique paths for version check...");
    let mut unique_paths = std::collections::HashSet::new();
    for it in list.iter() {
        let arr_opt = it.get("versions").and_then(|v| v.as_array()).or_else(|| it.get("version").and_then(|v| v.as_array()));
        if let Some(arr) = arr_opt {
            for ver in arr {
                if let Some(files) = ver.get("file").and_then(|v| v.as_array()) {
                    for f in files {
                        let raw = f.get("path").and_then(|v| v.as_str()).unwrap_or("");
                        // パスの区切りは一旦 Windows 風に合わせるが lowercasing はしない
                        let expanded = expand_macros(raw).replace('/', "\\");
                        if !is_abs(&expanded) {
                            return Err(format!("version.file.path must be an absolute path after macro expansion: {}", raw));
                        }
                        unique_paths.insert(expanded);
                    }
                }
            }
        }
    }
    log_info(app, &format!("Collected {} unique paths for version check.", unique_paths.len()));
    Ok(unique_paths)
}

// パス群に対してXXH3-128ハッシュを計算する。hash-cache.jsonを利用して、mtimeMsとsizeが一致する場合はキャッシュを利用し、そうでない場合は再計算する。
fn build_file_hash_cache(app: &tauri::AppHandle, unique_paths: &std::collections::HashSet<String>) -> std::collections::HashMap<String, String> {
    log_info(app, "Building file hash cache..."); // ログ(検証用)
    let mut disk_cache = read_hash_cache(app);
    let mut file_hash_cache = std::collections::HashMap::new();
    let mut to_hash = Vec::new(); // 再計算が必要なパスのリスト
    for path in unique_paths.iter() {
        let key = path.to_string(); // キーは大小保持
        if let Some((mtime_ms, size)) = stat_file(path) {
            if let Some(v) = disk_cache.get(&key) {
                let hex = v.get("xxh3_128").and_then(|x| x.as_str()).unwrap_or("");
                let m = v.get("mtimeMs").and_then(|x| x.as_u64()).or_else(|| v.get("mtimeMs").and_then(|x| x.as_i64().map(|y| y as u64))).unwrap_or(0) as u128;
                let sz = v.get("size").and_then(|x| x.as_u64()).unwrap_or(0);
                if !hex.is_empty() && m == mtime_ms && sz == size {
                    // キャッシュヒット：hex もパスも小文字化せず、そのまま保持
                    file_hash_cache.insert(key.clone(), hex.to_string());
                    continue;
                }
            }
            // ファイルは存在するがキャッシュミス：再計算対象に
            to_hash.push(key.clone());
        }
        // stat できない（存在しない等）の場合はスキップ（再計算不要）
    }

    // 再計算が必要なパスについてハッシュを計算
    for path_str in to_hash.iter() {
        match xxh3_128_hex(path_str) {
            Ok(hex) => {
                file_hash_cache.insert(path_str.clone(), hex);
            }
            Err(e) => {
                log_error(app, &format!("hash error path=\"{}\": {}", path_str, e));
            }
        }
    }
    // キャッシュを更新して保存(hash-cache.json用)
    for (k, hex) in file_hash_cache.iter() {
        if let Some((mtime_ms, size)) = stat_file(k) {
            // JSON には u64 で保存
            let mtime_ms_u64 = mtime_ms as u64;
            disk_cache.insert(k.clone(), serde_json::json!({"xxh3_128": hex, "mtimeMs": mtime_ms_u64, "size": size}));
        }
    }
    write_hash_cache(app, &disk_cache);
    log_info(app, &format!("Built file hash cache with {} entries.", file_hash_cache.len()));
    file_hash_cache
}

// 各アイテムについて、どのバージョンに一致するかをハッシュ照合で決定します。最新優先で後ろから（降順）チェック。
fn determine_versions(
    app: &tauri::AppHandle,
    list: &[serde_json::Value],
    file_hash_cache: &std::collections::HashMap<String, String>,
) -> std::collections::HashMap<String, String> {
    let mut out = std::collections::HashMap::new();
    log_info(app, "Detecting installed versions...");
    for it in list.iter() {
        let id = it.get("id").and_then(|v| v.as_str()).unwrap_or("").to_string();
        if id.is_empty() {
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
                if files_opt.is_none() || files_opt.as_ref().unwrap().is_empty() {
                    continue;
                }
                let files = files_opt.unwrap();
                let mut ok = true;
                for f in files {
                    let raw = f.get("path").and_then(|v| v.as_str()).unwrap_or("");
                    let expanded = expand_macros(raw).replace('/', "\\");
                    let key = expanded.clone();
                    let found_hex = file_hash_cache.get(&key).cloned().unwrap_or_default();
                    let want_hex = f.get("XXH3_128").or_else(|| f.get("xxh3_128")).and_then(|v| v.as_str()).unwrap_or("");
                    if !found_hex.is_empty() {
                        any_present = true;
                    }
                    if !found_hex.is_empty() && !want_hex.is_empty() && found_hex != want_hex {
                        any_mismatch = true;
                    }
                    if want_hex.is_empty() || found_hex != want_hex {
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
    }
    log_info(app, &format!("detect all done count={},files={:?}", list.len(), out));
    out
}

// 上記すべてをまとめて実行し、「各 id のインストール検出バージョン」を返すエントリポイント。
#[tauri::command]
fn detect_versions_map(app: tauri::AppHandle, items: Vec<serde_json::Value>) -> Result<std::collections::HashMap<String, String>, String> {
    let list = items;
    log_info(&app, &format!("detect map start count={}", list.len()));
    let unique_paths = collect_unique_paths(&app, &list)?;
    let file_hash_cache = build_file_hash_cache(&app, &unique_paths);
    let out = determine_versions(&app, &list, &file_hash_cache);
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

// ---------------------------
// ダウンロード関連
// ---------------------------

/// ファイルをコピーする関数
fn copy_item(src: &Path, dst: &Path) -> io::Result<usize> {
    let mut count = 0;
    // ファイル → ディレクトリ
    if src.is_file() {
        fs::create_dir_all(dst)?;
        let file_name = src.file_name().ok_or_else(|| io::Error::new(io::ErrorKind::Other, "Failed to get file name"))?;
        let dest_path = dst.join(file_name);
        fs::copy(src, dest_path)?;
        count += 1;
        return Ok(count);
    }
    if src.is_dir() {
        // ディレクトリ→ディレクトリ
        fs::create_dir_all(dst)?;
        for entry in WalkDir::new(src) {
            let entry = entry?;
            let path = entry.path();
            let rel = path.strip_prefix(src).map_err(|_| io::Error::new(io::ErrorKind::Other, "Failed to calculate relative path"))?;
            let dest_path: PathBuf = dst.join(rel);
            if entry.file_type().is_dir() {
                fs::create_dir_all(&dest_path)?;
            } else {
                if let Some(parent) = dest_path.parent() {
                    fs::create_dir_all(parent)?;
                }
                fs::copy(path, &dest_path)?;
                count += 1;
            }
        }
        return Ok(count);
    }

    Err(io::Error::new(io::ErrorKind::Other, "Source is neither a file nor a directory"))
}

#[tauri::command]
fn copy_item_js(src_str: String, dst_str: String) -> Result<usize, String> {
    let src = PathBuf::from(src_str);
    let dst = PathBuf::from(dst_str);
    copy_item(&src, &dst).map_err(|e| e.to_string())
}

// -----------------------
// プロセス状態の確認
// -----------------------

#[tauri::command]
fn is_aviutl_running() -> bool {
    use sysinfo::System;
    let sys = System::new_all();
    sys.processes().values().any(|proc| proc.name().eq_ignore_ascii_case("aviutl2.exe"))
}

#[tauri::command]
fn launch_aviutl2(app: tauri::AppHandle) -> Result<(), String> {
    let dirs = paths::dirs();
    let exe_path = dirs.aviutl2_root.join("aviutl2.exe");
    if !exe_path.exists() {
        return Err(format!("aviutl2.exe が見つかりませんでした: {}", exe_path.display()));
    }

    // 現在のディレクトリを aviutl2_root にして起動
    std::process::Command::new(&exe_path).current_dir(&dirs.aviutl2_root).spawn().map_err(|e| format!("起動に失敗しました: {}", e))?;

    log_info(&app, &format!("Launched AviUtl2: {}", exe_path.display()));
    Ok(())
}

// -----------------------
// Tauriアプリケーションのセットアップと起動
// -----------------------

// Tauriアプリケーションのメインエントリーポイント
pub fn run() {
    let mut builder = tauri::Builder::default();

    #[cfg(target_os = "windows")]
    {
        // アプリの多重起動を防止
        builder = builder.plugin(tauri_plugin_single_instance::init(|_app, _argv, _cwd| {}));
    }

    builder
        // フロントエンドで使用される Tauri v2 プラグインを登録
        .plugin(tauri_plugin_deep_link::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_http::init())
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_process::init())
        .plugin(tauri_plugin_updater::Builder::new().build())
        .on_window_event(|window, event| {
            if window.label() != "main" {
                return;
            }
            if matches!(event, tauri::WindowEvent::CloseRequested { .. }) {
                // メイン終了時に認証用ウィンドウも閉じて後処理する
                if let Some(booth) = window.app_handle().get_webview_window("booth-auth") {
                    let _ = booth.close();
                }
            }
        })
        .setup(|app| {
            #[cfg(all(debug_assertions, target_os = "windows"))]
            {
                use tauri_plugin_deep_link::DeepLinkExt;
                // 開発時のみ OS にスキーム登録
                app.deep_link().register_all().map_err(|e| std::io::Error::new(std::io::ErrorKind::Other, e.to_string()))?;
            }

            // 起動時に app.log を最新 1000 行に削減
            paths::init_settings(&app.handle())?;
            let _ = init_app(&app.handle());
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
            extract_7z_sfx,
            detect_versions_map,
            log_cmd,
            calc_xxh3_hex,
            get_installed_map_cmd,
            add_installed_id_cmd,
            remove_installed_id_cmd,
            drive_download_to_file,
            download_file_to_path,
            download_file_to_path_booth,
            ensure_booth_auth_window,
            close_booth_auth_window,
            expand_macros,
            copy_item_js,
            is_aviutl_running,
            launch_aviutl2,
            run_auo_setup,
            paths::complete_initial_setup,
            paths::update_settings,
            paths::default_aviutl2_root,
            paths::resolve_aviutl2_root,
            paths::get_app_dirs,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
