// use crate::paths::Dir;
use once_cell::sync::Lazy;
use std::fs;
use std::io::{self};
use std::path::{Path, PathBuf};
use std::sync::RwLock;
use tauri::{Emitter, Manager};
use walkdir::WalkDir;

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
use std::{
    io::Cursor, // trait だけ暗黙に使われることがあるためimport
};

use memchr::memmem::Finder;
use memmap2::MmapOptions;

// sevenz_rust2 の「関数」APIを使う
use sevenz_rust2::{
    decompress_with_extract_fn_and_password, // パスワード・カスタムextract_fnあり
    default_entry_extract_fn,
    Password,
};

#[tauri::command]
fn extract_7z_sfx(_app: tauri::AppHandle, sfx_path: String, dest_path: String) -> Result<(), String> {
    let sfx_abs = Path::new(&sfx_path);
    let dest_abs = Path::new(&dest_path);

    // EXE を開いてメモリマップ（ゼロコピー）
    let file = File::open(sfx_abs).map_err(|e| format!("open sfx error: {e}"))?;
    let mmap = unsafe { MmapOptions::new().map(&file) }.map_err(|e| format!("mmap error: {e}"))?;

    // 7z シグネチャを高速に検索
    const SIGNATURE: &[u8; 6] = b"\x37\x7A\xBC\xAF\x27\x1C";
    let finder = Finder::new(SIGNATURE);
    let Some(offset) = finder.find(&mmap[..]) else {
        return Err("7z signature not found in SFX binary".into());
    };

    // 以降を 7z ペイロードとして扱う（ゼロコピー）
    let payload = &mmap[offset..];
    if !payload.starts_with(SIGNATURE) {
        return Err("7z signature mismatch after carving".into());
    }

    // Read+Seek を満たすカーソルで sevenz_rust2 の関数APIに渡す
    let cursor = Cursor::new(payload);

    // パスワード不要なら Password::empty() を使う（必要なら Password::from("...")）
    decompress_with_extract_fn_and_password(cursor, dest_abs, Password::empty(), default_entry_extract_fn).map_err(|e| format!("7z decompress error: {e}"))?;

    Ok(())
}

// src/commands/run_auo_setup.rs
// src/commands/run_auo_setup.rs
// #![cfg(windows)]

// use anyhow::{Context, Result as AnyResult};
// use std::{ffi::c_void, sync::mpsc, thread};
// use tauri::AppHandle;
// use tokio::process::Command;
// use windows::{
//     core::w,
//     Win32::{
//         Foundation::{HINSTANCE, HWND, LPARAM, WPARAM},
//         System::{LibraryLoader::GetModuleHandleW, Threading::GetCurrentThreadId},
//         UI::WindowsAndMessaging::{
//             CreateWindowExW, DestroyWindow, DispatchMessageW, GetMessageW, GetWindowTextLengthW, GetWindowTextW, PostThreadMessageW, ShowWindow, TranslateMessage, ES_AUTOHSCROLL,
//             ES_AUTOVSCROLL, ES_MULTILINE, ES_READONLY, HMENU, MSG, SW_HIDE, WINDOW_EX_STYLE, WINDOW_STYLE, WM_QUIT, WS_CHILD, WS_HSCROLL, WS_POPUP, WS_VSCROLL,
//         },
//     },
// };

// const EDT_ID: i32 = 100;

// struct HiddenEdit {
//     thread_id: u32,
//     hwnd_parent: HWND,
//     hwnd_edit: HWND,
// }

// // Window handles are thread-safe to send for this usage (message loop stays on worker thread).
// unsafe impl Send for HiddenEdit {}

// fn spawn_hidden_edit() -> AnyResult<HiddenEdit> {
//     let (tx, rx) = mpsc::channel::<AnyResult<(u32, isize, isize)>>();

//     thread::spawn(move || unsafe {
//         let result: AnyResult<(u32, HWND, HWND)> = (|| {
//             let hinst = GetModuleHandleW(None).context("GetModuleHandleW failed")?;
//             let hinstance = HINSTANCE(hinst.0);

//             // 親（不可視のトップレベル）
//             let hwnd_parent = CreateWindowExW(WINDOW_EX_STYLE::default(), w!("STATIC"), None, WS_POPUP, 0, 0, 0, 0, None, None, Some(hinstance), None)
//                 .context("CreateWindowExW parent failed")?;

//             let edit_style = WINDOW_STYLE(WS_CHILD.0 | WS_VSCROLL.0 | WS_HSCROLL.0 | ES_READONLY as u32 | ES_MULTILINE as u32 | ES_AUTOVSCROLL as u32 | ES_AUTOHSCROLL as u32);

//             // 子 Edit（ここにインストーラがログを流す）
//             let hwnd_edit = CreateWindowExW(
//                 WINDOW_EX_STYLE::default(),
//                 w!("EDIT"),
//                 None,
//                 edit_style,
//                 0,
//                 0,
//                 0,
//                 0,
//                 Some(hwnd_parent),
//                 Some(HMENU(EDT_ID as usize as *mut c_void)),
//                 Some(hinstance),
//                 None,
//             )
//             .context("CreateWindowExW edit failed")?;

//             ShowWindow(hwnd_parent, SW_HIDE);
//             let tid = GetCurrentThreadId();
//             Ok((tid, hwnd_parent, hwnd_edit))
//         })();

//         let mut handles: Option<(HWND, HWND)> = None;
//         match result {
//             Ok((tid, hwnd_parent, hwnd_edit)) => {
//                 handles = Some((hwnd_parent, hwnd_edit));
//                 let parent_raw = hwnd_parent.0 as isize;
//                 let edit_raw = hwnd_edit.0 as isize;
//                 let _ = tx.send(Ok((tid, parent_raw, edit_raw)));
//             }
//             Err(err) => {
//                 let _ = tx.send(Err(err));
//             }
//         }

//         if let Some((hwnd_parent, hwnd_edit)) = handles {
//             // メッセージループ（他プロセスからの SendMessage を処理させるため必須）
//             let mut msg = MSG::default();
//             loop {
//                 let status = GetMessageW(&mut msg, None, 0, 0);
//                 if status.0 == -1 || !status.as_bool() {
//                     break;
//                 }
//                 TranslateMessage(&msg);
//                 DispatchMessageW(&msg);
//             }

//             // 後片付け
//             let _ = DestroyWindow(hwnd_edit);
//             let _ = DestroyWindow(hwnd_parent);
//         }
//     });

//     let res = rx.recv().context("failed to create hidden edit")?;
//     let (thread_id, hwnd_parent_raw, hwnd_edit_raw) = res?;
//     let hwnd_parent = HWND(hwnd_parent_raw as *mut c_void);
//     let hwnd_edit = HWND(hwnd_edit_raw as *mut c_void);
//     Ok(HiddenEdit { thread_id, hwnd_parent, hwnd_edit })
// }

// fn stop_hidden_edit(loop_thread_id: u32) {
//     unsafe {
//         // ループを終了
//         let _ = PostThreadMessageW(loop_thread_id, WM_QUIT, WPARAM(0), LPARAM(0));
//     }
// }

// // UTF-16 安全に全文を取る
// fn read_all_text(hwnd: HWND) -> String {
//     unsafe {
//         let len = GetWindowTextLengthW(hwnd) as usize; // 文字数（UTF-16 code unit）
//         if len == 0 {
//             return String::new();
//         }
//         let mut buf = vec![0u16; len + 1];
//         let n = GetWindowTextW(hwnd, &mut buf) as usize;
//         buf.truncate(n);
//         String::from_utf16_lossy(&buf)
//     }
// }

// // ---- ここが JS から呼ばれるコマンド ----

// async fn run_auo_setup_impl(app: AppHandle, args: Option<Vec<String>>) -> Result<i32, String> {
//     // 1) 隠し Edit を用意
//     println!("[auo] spawn_hidden_edit..."); // ← NEW
//     let edit = spawn_hidden_edit().map_err(|e| e.to_string())?;
//     println!("[auo] hidden edit hwnd={:?} (thread_id={})", edit.hwnd_edit, edit.thread_id); // ← NEW

//     // 2) 引数整形
//     let exe_path = r"C:\Users\okuno\AppData\Roaming\aviutl2-catalog\installer-tmp\rigaya.x264guiEx-4.06\Plugin\exe_files\auo_setup2.exe";
//     let phwnd = format!("0x{:x}", edit.hwnd_edit.0 as usize);
//     let ppid = format!("0x{:08x}", std::process::id());

//     let mut argv: Vec<String> = vec![
//         "-ppid".into(),
//         ppid.clone(),
//         "-phwnd".into(),
//         phwnd.clone(),
//         "-aviutldir-default".into(),
//     ];
//     if let Some(extra) = args {
//         argv.extend(extra);
//     }
//     println!("[auo] exe = {}", exe_path); // ← NEW
//     println!("[auo] args = {:?}", argv); // ← NEW

//     // 3) 起動
//     let mut child = Command::new(exe_path)
//         .args(argv.clone())
//         .stdin(std::process::Stdio::null())
//         .stdout(std::process::Stdio::null())
//         .stderr(std::process::Stdio::null())
//         .spawn()
//         .map_err(|e| format!("failed to spawn: {e}"))?;
//     println!("[auo] spawned pid={:?}", child.id()); // ← NEW

//     // 4) ログ監視（差分のみ）
//     let mut prev = String::new();
//     println!("[auo] start polling hidden edit..."); // ← NEW
//     loop {
//         if let Some(status) = child.try_wait().map_err(|e| e.to_string())? {
//             println!("[auo] child exited: {:?}", status); // ← NEW

//             // 最終吸い出し
//             let now = read_all_text(edit.hwnd_edit);
//             if now.starts_with(&prev) && now.len() > prev.len() {
//                 let delta = &now[prev.len()..];
//                 println!("[auo] final delta:\n{}", delta); // ← NEW
//                 let _ = app.emit("auo-setup-log", delta.to_string());
//             } else if !now.is_empty() {
//                 println!("[auo] final full:\n{}", now); // ← NEW
//                 let _ = app.emit("auo-setup-log", now.clone());
//             }

//             stop_hidden_edit(edit.thread_id);
//             let code = status.code().unwrap_or_default();
//             println!("[auo] returning exit code {}", code); // ← NEW
//             return Ok(code);
//         }

//         // 差分取得
//         let now = read_all_text(edit.hwnd_edit);
//         if now.starts_with(&prev) && now.len() > prev.len() {
//             let delta = &now[prev.len()..];
//             println!("[auo] log delta:\n{}", delta); // ← NEW
//             let _ = app.emit("auo-setup-log", delta.to_string());
//             prev = now;
//         } else if now != prev {
//             // まれに全置換された場合
//             println!("[auo] log replaced (len {} -> {}), sending full", prev.len(), now.len()); // ← NEW
//             let _ = app.emit("auo-setup-log", now.clone());
//             prev = now;
//         }

//         tokio::time::sleep(std::time::Duration::from_millis(250)).await;
//     }
// }

// #[tauri::command(rename = "run_auo_setup")]
// fn run_auo_setup_cmd(app: AppHandle, args: Option<Vec<String>>) -> Result<i32, String> {
//     tauri::async_runtime::block_on(run_auo_setup_impl(app, args))
// }

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
fn collect_unique_paths(app: &tauri::AppHandle, list: &[serde_json::Value]) -> std::collections::HashSet<String> {
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
                        unique_paths.insert(expanded);
                    }
                }
            }
        }
    }
    log_info(app, &format!("Collected {} unique paths for version check.", unique_paths.len()));
    unique_paths
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
    let unique_paths = collect_unique_paths(&app, &list);
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
            get_installed_map_cmd,
            add_installed_id_cmd,
            remove_installed_id_cmd,
            drive_download_to_file,
            expand_macros,
            copy_item_js,
            // run_auo_setup_cmd,
            paths::complete_initial_setup,
            paths::update_settings,
            paths::default_aviutl2_root,
            paths::resolve_aviutl2_root,
            paths::get_app_dirs,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
