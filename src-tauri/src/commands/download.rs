use percent_encoding::percent_decode_str;
use std::path::PathBuf;
use tauri::{Emitter, Manager, WebviewUrl, WebviewWindowBuilder, webview::PageLoadEvent};
use url::Url;

#[derive(thiserror::Error, Debug, serde::Serialize)]
pub enum DriveError {
    #[error("io error: {0}")]
    Io(String),
    #[error("http error: {0}")]
    Http(String),
    #[error("network error: {0}")]
    Net(String),
}

fn is_abs(p: &str) -> bool {
    let s = p.replace('\\', "/");
    s.starts_with('/') || (s.len() >= 3 && s.as_bytes()[1] == b':' && (s.as_bytes()[2] == b'/' || s.as_bytes()[2] == b'\\'))
}

fn resolve_rel_to_app_config(app: &tauri::AppHandle, p: &str) -> PathBuf {
    if is_abs(p) { PathBuf::from(p) } else { app.path().app_config_dir().unwrap_or_else(|_| std::env::temp_dir()).join(p) }
}

fn sanitize_filename(name: &str) -> String {
    let mut out = String::new();
    for ch in name.chars() {
        if matches!(ch, '/' | '\\' | ':' | '*' | '?' | '"' | '<' | '>' | '|') {
            out.push('_');
        } else {
            out.push(ch);
        }
    }
    let trimmed = out.trim();
    if trimmed.is_empty() { String::from("download.bin") } else { trimmed.to_string() }
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

fn is_booth_login_path(path: &str) -> bool {
    let p = path.trim_end_matches('/');
    p.starts_with("/users/sign_in") || p.starts_with("/users/sign_in_by_password") || p.starts_with("/users/password/new") || p.starts_with("/users/unlock/new")
}

fn is_booth_login_url(url: &Url) -> bool {
    let host = url.host_str().unwrap_or("");
    host.ends_with("booth.pm") && is_booth_login_path(url.path())
}

fn is_booth_logged_in_url(url: &Url) -> bool {
    let host = url.host_str().unwrap_or("");
    host.ends_with("booth.pm") && !is_booth_login_path(url.path())
}

#[tauri::command]
pub async fn drive_download_to_file(window: tauri::Window, file_id: String, dest_path: String) -> Result<(), DriveError> {
    use std::fs::{OpenOptions, create_dir_all};
    use std::io::Write;

    let app = window.app_handle();
    let mut res = match drive_fetch_response(&file_id).await {
        Ok(v) => v,
        Err(e) => {
            tracing::error!("failed to fetch drive file (id={}): {}", file_id, e);
            return Err(e);
        }
    };

    let dest_abs = resolve_rel_to_app_config(app, &dest_path);
    let looks_dir = dest_path.ends_with('/') || dest_path.ends_with('\\') || dest_abs.is_dir();
    let is_placeholder = dest_abs.file_name().and_then(|s| s.to_str()).map(|s| s.eq_ignore_ascii_case("download.bin") || s == file_id).unwrap_or(true);
    let drive_name = drive_filename_from_headers(res.headers());

    let final_dest = if looks_dir || is_placeholder {
        let drive_name = drive_name.ok_or_else(|| DriveError::Http("missing filename in Google Drive response".to_string()))?;
        if looks_dir { dest_abs.join(drive_name) } else { dest_abs.parent().map(|p| p.join(drive_name)).unwrap_or(dest_abs.clone()) }
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
pub async fn download_file_to_path(window: tauri::Window, url: String, dest_path: String, task_id: Option<String>) -> Result<String, String> {
    use std::fs::{OpenOptions, create_dir_all};
    use std::io::Write;

    if !url.trim_start().to_ascii_lowercase().starts_with("https://") {
        return Err("Only https:// is permitted".to_string());
    }
    if dest_path.trim().is_empty() {
        return Err("dest_path must not be empty".to_string());
    }

    let app = window.app_handle();
    let task_id = task_id.unwrap_or_else(|| format!("download-{}", chrono::Utc::now().timestamp_micros()));
    let dest_dir = resolve_rel_to_app_config(app, &dest_path);
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
    let file_name_raw = parsed_url.path_segments().and_then(|mut segments| segments.rfind(|s| !s.is_empty())).map(|s| s.to_string()).unwrap_or_else(|| "download.bin".to_string());
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
        tracing::error!("download failed (url={}): {}", url, e);
        msg
    })?;

    let status = response.status();
    if !status.is_success() {
        let text = response.text().await.unwrap_or_default();
        let body_snippet: String = if text.len() > 500 { text[..500].to_string() } else { text };
        let msg = if body_snippet.is_empty() { format!("HTTP error: {}", status) } else { format!("HTTP error: {}: {}", status, body_snippet) };
        let _ = window.emit("download:error", serde_json::json!({ "taskId": task_id, "message": msg }));
        tracing::error!("download failed (url={}): {}", url, msg);
        return Err(msg);
    }

    let total_opt = response.content_length();
    let mut file = OpenOptions::new().create(true).truncate(true).write(true).open(&final_path).map_err(|e| {
        let msg = format!("failed to open destination file: {}", e);
        let _ = window.emit("download:error", serde_json::json!({ "taskId": task_id, "message": msg }));
        tracing::error!("download failed (url={}): {}", url, msg);
        msg
    })?;

    let mut written: u64 = 0;
    while let Some(chunk) = response.chunk().await.map_err(|e| {
        let msg = format!("read error: {}", e);
        let _ = window.emit("download:error", serde_json::json!({ "taskId": task_id, "message": msg }));
        tracing::error!("download failed (url={}): {}", url, msg);
        msg
    })? {
        file.write_all(&chunk).map_err(|e| {
            let msg = format!("write error: {}", e);
            let _ = window.emit("download:error", serde_json::json!({ "taskId": task_id, "message": msg }));
            tracing::error!("download failed (url={}): {}", url, msg);
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

#[tauri::command]
pub async fn ensure_booth_auth_window(app: tauri::AppHandle) -> Result<(), String> {
    let app_handle = app.clone();
    tauri::async_runtime::spawn_blocking(move || {
        let login_url = Url::parse("https://booth.pm/users/sign_in").map_err(|e| e.to_string())?;
        let data_dir = app_handle.path().app_data_dir().map_err(|e| e.to_string())?.join("booth-auth");
        let _ = std::fs::create_dir_all(&data_dir);
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
                    let _ = window.show();
                    let _ = window.set_focus();
                }
            }
            return Ok(());
        }
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
                    let _ = app_for_event.emit("booth-auth:login-complete", serde_json::json!({ "url": url.as_str() }));
                    let _ = window.hide();
                    return;
                }
                if is_booth_login_url(url) {
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

#[tauri::command]
pub fn close_booth_auth_window(app: tauri::AppHandle) -> Result<(), String> {
    if let Some(window) = app.get_webview_window("booth-auth") {
        let _ = window.close();
    }
    Ok(())
}

#[tauri::command]
pub async fn download_file_to_path_booth(
    window: tauri::Window,
    url: String,
    dest_path: String,
    task_id: Option<String>,
    session_window_label: Option<String>,
) -> Result<String, String> {
    use reqwest::header::{CONTENT_DISPOSITION, CONTENT_TYPE, COOKIE};
    use std::fs::{OpenOptions, create_dir_all};
    use std::io::Write;

    if !url.trim_start().to_ascii_lowercase().starts_with("https://") {
        return Err("Only https:// is permitted".to_string());
    }
    if dest_path.trim().is_empty() {
        return Err("dest_path must not be empty".to_string());
    }

    let app = window.app_handle();
    let task_id = task_id.unwrap_or_else(|| format!("download-{}", chrono::Utc::now().timestamp_micros()));
    let dest_dir = resolve_rel_to_app_config(app, &dest_path);
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

    let cookies = session_window.cookies_for_url(parsed_url.clone()).map_err(|e| {
        let msg = format!("AUTH_COOKIE_FETCH_FAILED: {}", e);
        let _ = window.emit("download:error", serde_json::json!({ "taskId": task_id, "message": msg }));
        msg
    })?;
    let cookie_header = cookies.iter().map(|c| format!("{}={}", c.name(), c.value())).collect::<Vec<_>>().join("; ");

    let file_name_raw = parsed_url.path_segments().and_then(|mut segments| segments.rfind(|s| !s.is_empty())).map(|s| s.to_string()).unwrap_or_else(|| "download.bin".to_string());
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
        tracing::error!("booth download failed (url={}): {}", url, e);
        msg
    })?;

    let status = response.status();
    if !status.is_success() {
        let msg = format!("HTTP_ERROR:{} {}", status.as_u16(), status);
        let _ = window.emit("download:error", serde_json::json!({ "taskId": task_id, "message": msg }));
        tracing::error!("booth download failed (url={}): {}", url, msg);
        return Err(msg);
    }

    let final_url = response.url().clone();
    if is_booth_login_url(&final_url) {
        let msg = "AUTH_REQUIRED".to_string();
        let _ = window.emit("download:error", serde_json::json!({ "taskId": task_id, "message": msg }));
        return Err(msg);
    }

    let content_type = response.headers().get(CONTENT_TYPE).and_then(|v| v.to_str().ok()).unwrap_or("").to_ascii_lowercase();
    let content_disposition = response.headers().get(CONTENT_DISPOSITION);
    if content_type.contains("text/html") && content_disposition.is_none() {
        let msg = "AUTH_REQUIRED".to_string();
        let _ = window.emit("download:error", serde_json::json!({ "taskId": task_id, "message": msg }));
        return Err(msg);
    }

    let total_opt = response.content_length();
    let mut file = OpenOptions::new().create(true).truncate(true).write(true).open(&final_path).map_err(|e| {
        let msg = format!("failed to open destination file: {}", e);
        let _ = window.emit("download:error", serde_json::json!({ "taskId": task_id, "message": msg }));
        tracing::error!("booth download failed (url={}): {}", url, msg);
        msg
    })?;

    let mut written: u64 = 0;
    while let Some(chunk) = response.chunk().await.map_err(|e| {
        let msg = format!("read error: {}", e);
        let _ = window.emit("download:error", serde_json::json!({ "taskId": task_id, "message": msg }));
        tracing::error!("booth download failed (url={}): {}", url, msg);
        msg
    })? {
        file.write_all(&chunk).map_err(|e| {
            let msg = format!("write error: {}", e);
            let _ = window.emit("download:error", serde_json::json!({ "taskId": task_id, "message": msg }));
            tracing::error!("booth download failed (url={}): {}", url, msg);
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
