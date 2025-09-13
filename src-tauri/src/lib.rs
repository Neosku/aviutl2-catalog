use once_cell::sync::Lazy;
use tauri::Manager;
use std::sync::RwLock;

// XXH3-128ハッシュを計算してhex文字列で返す（リトルエンディアン）
#[tauri::command]
fn xxh3_128_hex(path: String) -> Result<String, String> {
    use std::fs::File;
    use std::io::{BufReader, Read};
    use xxhash_rust::xxh3::Xxh3;

    let file = File::open(&path).map_err(|e| format!("open error: {}", e))?;
    let mut reader = BufReader::new(file);
    let mut hasher = Xxh3::new();
    let mut buf = [0u8; 8192];
    loop {
        let n = reader
            .read(&mut buf)
            .map_err(|e| format!("read error: {}", e))?;
        if n == 0 {
            break;
        }
        hasher.update(&buf[..n]);
    }
    // XXH3-128の正規表現はリトルエンディアンバイト順が一般的
    // カタログで使用される共通のhexダイジェストに合わせるためリトルエンディアンを使用
    let digest = hasher.digest128().to_le_bytes();
    let hex = digest.iter().map(|b| format!("{:02x}", b)).collect::<String>();
    Ok(hex)
}

// xxh3_128_hexの別名エイリアス
#[tauri::command]
fn xxh3_file_hex(path: String) -> Result<String, String> {
    xxh3_128_hex(path)
}

// ハッシュ計算結果の構造体
#[derive(serde::Serialize)]
struct HashResult {
    path: String,
    hex: Option<String>,
    error: Option<String>,
}

// 複数ファイルのハッシュを一括計算
#[tauri::command]
fn xxh3_many(paths: Vec<String>) -> Vec<HashResult> {
    use std::fs::File;
    use std::io::{BufReader, Read};
    use xxhash_rust::xxh3::Xxh3;
    let mut out: Vec<HashResult> = Vec::with_capacity(paths.len());
    for p in paths {
        let mut res = HashResult {
            path: p.clone(),
            hex: None,
            error: None,
        };
        match File::open(&p) {
            Ok(file) => {
                let mut reader = BufReader::new(file);
                let mut hasher = Xxh3::new();
                let mut buf = [0u8; 8192];
                loop {
                    match reader.read(&mut buf) {
                        Ok(0) => break,
                        Ok(n) => {
                            hasher.update(&buf[..n]);
                        }
                        Err(e) => {
                            res.error = Some(format!("read error: {}", e));
                            break;
                        }
                    }
                }
                if res.error.is_none() {
                    let digest = hasher.digest128().to_le_bytes();
                    let hex = digest.iter().map(|b| format!("{:02x}", b)).collect::<String>();
                    res.hex = Some(hex);
                }
            }
            Err(e) => {
                res.error = Some(format!("open error: {}", e));
            }
        }
        out.push(res);
    }
    out
}

// -----------------------
// カタログインデックスとRust内での検索処理
// -----------------------

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
    let arr = match arr_opt { Some(a) => a, None => return None };
    if arr.is_empty() { return None; }
    let last = &arr[arr.len() - 1];
    let s = last.get("release_date").and_then(|v| v.as_str()).unwrap_or("");
    // YYYY-MM-DDまたはYYYY/MM/DDを受け入れ、非常に寛容
    let s = s.replace('/', "-");
    let parts: Vec<&str> = s.split('-').collect();
    if parts.len() < 3 { return None; }
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
        let id = it
            .get("id")
            .and_then(|v| v.as_str())
            .unwrap_or("")
            .to_string();
        if id.is_empty() {
            continue;
        }
        let name = it
            .get("name")
            .and_then(|v| v.as_str())
            .unwrap_or("")
            .to_string();
        let item_type = it
            .get("type")
            .and_then(|v| v.as_str())
            .unwrap_or("")
            .to_string();
        let tags: Vec<String> = it
            .get("tags")
            .and_then(|v| v.as_array())
            .map(|arr| {
                arr.iter()
                    .filter_map(|x| x.as_str().map(|s| s.to_string()))
                    .collect::<Vec<_>>()
            })
            .unwrap_or_default();
        let author = it
            .get("author")
            .and_then(|v| v.as_str())
            .unwrap_or("")
            .to_string();
        let summary = it
            .get("summary")
            .and_then(|v| v.as_str())
            .unwrap_or("")
            .to_string();
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
    let mut guard = CATALOG
        .write()
        .map_err(|_| String::from("catalog lock poisoned"))?;
    *guard = v;
    Ok(guard.len())
}

// カタログ検索クエリ実行
#[tauri::command]
fn query_catalog_index(
    q: Option<String>,
    tags: Option<Vec<String>>,
    types: Option<Vec<String>>,
    sort: Option<String>,
    dir: Option<String>,
) -> Vec<String> {
    let guard = match CATALOG.read() {
        Ok(g) => g,
        Err(_) => return Vec::new(),
    };
    let qnorm = q.unwrap_or_default();
    let terms: Vec<String> = normalize(&qnorm)
        .split_whitespace()
        .filter(|s| !s.is_empty())
        .map(|s| s.to_string())
        .collect();
    let tag_filter = tags.unwrap_or_default();
    let type_filter = types.unwrap_or_default();
    let mut filtered: Vec<&IndexItem> = guard
        .iter()
        .filter(|it| {
            // クエリでのフィルタリング
            let qok = if terms.is_empty() {
                true
            } else {
                terms.iter().all(|t| {
                    it.name_key.contains(t) || it.author_key.contains(t) || it.summary_key.contains(t)
                })
            };
            if !qok {
                return false;
            }
            // タグでのフィルタリング（OR条件）
            let tag_ok = if tag_filter.is_empty() {
                true
            } else {
                it.tags.iter().any(|t| tag_filter.iter().any(|x| x == t))
            };
            if !tag_ok {
                return false;
            }
            // 種別でのフィルタリング（OR条件）
            let type_ok = if type_filter.is_empty() {
                true
            } else {
                type_filter.iter().any(|x| x == &it.item_type)
            };
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
// 高速ZIPファイル解凍（JavaScriptのfflateの代わりにRustで実装）
// -----------------------

#[tauri::command]
fn extract_zip(app: tauri::AppHandle, zip_path: String, dest_path: String, base: Option<String>) -> Result<(), String> {
    use std::fs::{self, File};
    use std::io::copy;
    use std::path::{Path, PathBuf};
    use zip::read::ZipArchive;

    fn is_abs(p: &str) -> bool {
        let p = p.replace('\\', "/");
        p.starts_with('/') || p.get(1..3) == Some(":/") || p.get(1..3) == Some(":\\")
    }
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

    let zip_abs = resolve_base(&app, &zip_path, &base);
    let dest_abs = resolve_base(&app, &dest_path, &base);

    let file = File::open(&zip_abs).map_err(|e| format!("open zip error: {}", e))?;
    let mut archive = ZipArchive::new(file).map_err(|e| format!("zip open error: {}", e))?;
    for i in 0..archive.len() {
        let mut entry = archive.by_index(i).map_err(|e| format!("zip index error: {}", e))?;
        let name = entry.name().to_string();
        let outpath = dest_abs.join(Path::new(&name));
        if entry.is_dir() {
            fs::create_dir_all(&outpath).map_err(|e| format!("mkdir error: {}", e))?;
        } else {
            if let Some(parent) = outpath.parent() { fs::create_dir_all(parent).map_err(|e| format!("mkdir error: {}", e))?; }
            let mut outfile = File::create(&outpath).map_err(|e| format!("create file error: {}", e))?;
            copy(&mut entry, &mut outfile).map_err(|e| format!("write file error: {}", e))?;
            // 可能な場合はファイルパーミッションを保持
            #[cfg(unix)]
            {
                use std::os::unix::fs::PermissionsExt;
                if let Some(mode) = entry.unix_mode() {
                    let _ = fs::set_permissions(&outpath, fs::Permissions::from_mode(mode));
                }
            }
        }
    }
    Ok(())
}

// -----------------------
// 高速インストール済みバージョン検出処理（Rustで実装）
// JavaScript版のdetectInstalledVersionsMapの処理を高速化しながら出力形式は保持
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
    if s.is_empty() { return s; }
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

// ログファイルに1行書き込み
fn log_line(app: &tauri::AppHandle, level: &str, msg: &str) {
    use std::fs::{create_dir_all, OpenOptions};
    use std::io::Write;
    let base = app_config_dir(app);
    let logs = base.join("logs");
    let _ = create_dir_all(&logs);
    let file = logs.join("app.log");
    // タイムスタンプを "YYYY-MM-DD HH:MM:SS.mmm ZZZ" 形式に（例: 2025-09-11 00:32:00.293 JST）
    let now = chrono::Local::now();
    let offset = now.offset().local_minus_utc(); // seconds
    let zone = if offset == 9 * 3600 { // JST 判定（UTC+09:00）
        "JST".to_string()
    } else {
        let sign = if offset >= 0 { '+' } else { '-' };
        let abs = offset.abs();
        let hh = abs / 3600;
        let mm = (abs % 3600) / 60;
        format!("UTC{}{:02}:{:02}", sign, hh, mm)
    };
    let ts_core = now.format("%Y-%m-%d %H:%M:%S%.3f").to_string();
    let ts = format!("{} {}", ts_core, zone);
    let line = format!("[{}] [{}] {}\n", ts, level, msg);
    if let Ok(mut f) = OpenOptions::new().create(true).append(true).open(file) {
        let _ = f.write_all(line.as_bytes());
    }
}

// ログレベル別のヘルパー関数
fn log_info(app: &tauri::AppHandle, msg: &str) { log_line(app, "INFO", msg); }
fn log_error(app: &tauri::AppHandle, msg: &str) { log_line(app, "ERROR", msg); }

// Tauri コマンド: INFOレベルでログ出力
#[tauri::command]
fn log_info_cmd(app: tauri::AppHandle, msg: String) { log_info(&app, &msg); }

// Tauri コマンド: ERRORレベルでログ出力
#[tauri::command]
fn log_error_cmd(app: tauri::AppHandle, msg: String) { log_error(&app, &msg); }

// app.logファイルの最新max_lines行のみを保持し、古いエントリを削除
// 起動時に呼ばれて、ログファイルの無制限な成長を防ぐ
fn prune_app_log(app: &tauri::AppHandle, max_lines: usize) -> Result<(), String> {
    use std::fs::{create_dir_all, OpenOptions};
    use std::io::{Read, Write};
    // 起動時フック: settings.json を初期化（初回のみ defaultPaths を追記）し、catalogDir を常に更新
    {
        use std::fs::{self, File};
        use std::path::PathBuf;
        let exe_path = std::env::current_exe().unwrap_or_else(|_| PathBuf::from(""));
        let exe_str = exe_path.to_string_lossy().replace('/', "\\");
        let base = app_config_dir(app);
        let _ = create_dir_all(&base);
        let path = base.join("settings.json");
        let first_run = !path.exists();
        let mut obj = serde_json::json!({});
        if let Ok(mut f) = File::open(&path) {
            let mut s = String::new();
            if f.read_to_string(&mut s).is_ok() {
                if let Ok(v) = serde_json::from_str::<serde_json::Value>(&s) {
                    if v.is_object() { obj = v; }
                }
            }
        }
        if let Some(map) = obj.as_object_mut() {
            // 初回のみ defaultPaths を付与
            if first_run {
                map.entry("appDir").or_insert(serde_json::Value::String(String::from("C:/Program Files/AviUtl2")));
                map.entry("pluginsDir").or_insert(serde_json::Value::String(String::from("C:/ProgramData/aviutl2/Plugin")));
                map.entry("scriptsDir").or_insert(serde_json::Value::String(String::from("C:/ProgramData/aviutl2/Script")));
            }
            // 常に catalogDir は最新の EXE 絶対パスで上書き
            map.insert("catalogDir".to_string(), serde_json::Value::String(exe_str.clone()));
        }
        if let Ok(mut f) = File::create(&path) {
            let _ = f.write_all(serde_json::to_string_pretty(&obj).unwrap_or_else(|_| String::from("{}")).as_bytes());
        }

        // アプリの現在バージョンと前回起動バージョンを比較して、
        // 初回およびアップデート後に UpdateChecker.aui2 を pluginsDir に配置/更新する
        // さらに、ファイルが存在しない場合も配置する
        let current_ver = app.package_info().version.to_string();
        let prev_ver = obj.get("appVersion").and_then(|v| v.as_str()).unwrap_or("");
        let need_place_plugin = first_run || prev_ver != current_ver;
        let plugins_dir = obj
            .get("pluginsDir")
            .and_then(|v| v.as_str())
            .unwrap_or("C:/ProgramData/aviutl2/Plugin");
        let plugins_dir = plugins_dir.replace('/', "\\");
        let dst = PathBuf::from(&plugins_dir).join("UpdateChecker.aui2");
        let parent_dir = dst
            .parent()
            .map(|p| p.to_path_buf())
            .unwrap_or_else(|| PathBuf::from(&plugins_dir));
        let _ = fs::create_dir_all(&parent_dir);

        // 配置条件: 初回 or アップデート後 or 先にファイルが存在しない
        if need_place_plugin || !dst.exists() {
            // 既存ファイルがある場合は上書きする（アップデート内容を反映）
            let mut copied = false;
            // 1) バンドルリソースから
            if let Ok(resdir) = app.path().resource_dir() {
                // Windowsでは大文字小文字は区別されないが、念のため両方試す
                let candidates: Vec<PathBuf> = vec![
                    resdir.join("UpdateChecker.aui2"),
                    resdir.join("updateChecker.aui2"),
                    resdir.join("resources").join("UpdateChecker.aui2"),
                    resdir.join("resources").join("updateChecker.aui2"),
                ];
                for src in candidates.iter() {
                    if src.exists() {
                        match fs::copy(&src, &dst) {
                            Ok(_) => {
                                copied = true;
                                log_info(app, &format!(
                                    "placed UpdateChecker.aui2 to {} (src: {})",
                                    dst.to_string_lossy(),
                                    src.to_string_lossy()
                                ));
                                break;
                            }
                            Err(e) => {
                                log_error(app, &format!(
                                    "copy UpdateChecker.aui2 failed from {}: {}",
                                    src.to_string_lossy(),
                                    e
                                ));
                            }
                        }
                    }
                }
            }
            // 1.5) 実行ファイルと同階層の resources も候補
            if !copied {
                if let Some(exe_dir) = std::env::current_exe()
                    .ok()
                    .and_then(|p| p.parent().map(|p| p.to_path_buf()))
                {
                    let exe_candidates = [
                        exe_dir.join("resources").join("UpdateChecker.aui2"),
                        exe_dir.join("resources").join("updateChecker.aui2"),
                    ];
                    for src in exe_candidates.iter() {
                        if src.exists() {
                            match fs::copy(&src, &dst) {
                                Ok(_) => {
                                    copied = true;
                                    log_info(app, &format!(
                                        "placed UpdateChecker.aui2 to {} (src: {})",
                                        dst.to_string_lossy(),
                                        src.to_string_lossy()
                                    ));
                                    break;
                                }
                                Err(e) => {
                                    log_error(app, &format!(
                                        "copy UpdateChecker.aui2 failed from {}: {}",
                                        src.to_string_lossy(),
                                        e
                                    ));
                                }
                            }
                        }
                    }
                }
            }
            // 2) 開発環境の相対パスからのフォールバック
            if !copied {
                let dev_candidates = [
                    PathBuf::from("src-tauri").join("resources").join("UpdateChecker.aui2"),
                    PathBuf::from("src-tauri").join("resources").join("updateChecker.aui2"),
                ];
                for dev_src in dev_candidates.iter() {
                    if dev_src.exists() {
                        match fs::copy(&dev_src, &dst) {
                            Ok(_) => {
                                copied = true;
                                log_info(app, &format!(
                                    "placed UpdateChecker.aui2 (dev) to {} (src: {})",
                                    dst.to_string_lossy(),
                                    dev_src.to_string_lossy()
                                ));
                                break;
                            }
                            Err(e) => {
                                log_error(app, &format!(
                                    "copy UpdateChecker.aui2 (dev) failed from {}: {}",
                                    dev_src.to_string_lossy(),
                                    e
                                ));
                            }
                        }
                    }
                }
            }
            if !copied {
                log_error(app, &format!(
                    "UpdateChecker.aui2 not found in resources; could not place to {}",
                    dst.to_string_lossy()
                ));
            }
        }

        // 前回起動バージョンを更新して保存
        if let Some(map) = obj.as_object_mut() {
            map.insert(
                "appVersion".to_string(),
                serde_json::Value::String(current_ver.clone()),
            );
            // 保存（appVersion含む）
            if let Ok(mut f) = File::create(&path) {
                let _ = f.write_all(
                    serde_json::to_string_pretty(&obj)
                        .unwrap_or_else(|_| String::from("{}"))
                        .as_bytes(),
                );
            }
        }
    }
    let base = app_config_dir(app);
    let logs = base.join("logs");
    let _ = create_dir_all(&logs);
    let file = logs.join("app.log");
    if !file.exists() { return Ok(()); }

    let mut f = match OpenOptions::new().read(true).open(&file) {
        Ok(x) => x,
        Err(_) => return Ok(()),
    };
    let mut buf = String::new();
    if let Err(_) = f.read_to_string(&mut buf) { return Ok(()); }
    let lines: Vec<&str> = buf.lines().collect();
    if lines.len() <= max_lines { return Ok(()); }
    let start = lines.len().saturating_sub(max_lines);
    let tail = lines[start..].join("\n");
    let mut out = tail;
    if !out.ends_with('\n') { out.push('\n'); }
    // 削除した内容でファイルを上書き
    if let Ok(mut wf) = OpenOptions::new().write(true).truncate(true).open(&file) {
        let _ = wf.write_all(out.as_bytes());
    }
    Ok(())
}

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
    if s.app_dir.is_empty() { s.app_dir = String::from("C:/Program Files/AviUtl2"); }
    if s.plugins_dir.is_empty() { s.plugins_dir = String::from("C:/ProgramData/aviutl2/Plugin"); }
    s.app_dir = normalize_saved_path(s.app_dir);
    s.plugins_dir = normalize_saved_path(s.plugins_dir);
    s
}

// 相対パスを絶対パスに変換（検証用）
fn to_absolute_for_check(app: &tauri::AppHandle, p: &str) -> String {
    if p.is_empty() { return String::new(); }
    if is_abs_path(p) { return p.replace('/', "\\"); }
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
                        if ft.is_dir() { folders.push(name); }
                        else { files.push(name); }
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
                    for (k, vv) in obj.iter() { map.insert(k.to_lowercase(), vv.clone()); }
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

// ファイルのXXH3-128ハッシュを計算（リトルエンディアン）
fn xxh3_file_hex_le(path: &str) -> Result<String, String> {
    use std::fs::File;
    use std::io::{Read, BufReader};
    use xxhash_rust::xxh3::Xxh3;
    let file = File::open(path).map_err(|e| format!("open error: {}", e))?;
    let mut reader = BufReader::new(file);
    let mut hasher = Xxh3::new();
    let mut buf = [0u8; 8192];
    loop {
        let n = reader.read(&mut buf).map_err(|e| format!("read error: {}", e))?;
        if n == 0 { break; }
        hasher.update(&buf[..n]);
    }
    let digest = hasher.digest128().to_le_bytes();
    Ok(digest.iter().map(|b| format!("{:02x}", b)).collect::<String>())
}

// インストール済みバージョンの検出処理（Rust高速化版）
#[tauri::command]
fn detect_versions_map(app: tauri::AppHandle, items: Vec<serde_json::Value>) -> Result<std::collections::HashMap<String, String>, String> {
    use std::collections::{HashMap, HashSet};
    let list = items;
    log_info(&app, &format!("detect map start count={}", list.len()));

    // 設定の読み込みとクイックスキャン
    let settings = read_settings(&app);
    let base_app = settings.app_dir.trim().trim_matches('"').trim_end_matches(['/', '\\']).to_string();
    let candidates_exe = vec![format!("{}\\\\aviutl2.exe", base_app), format!("{}\\\\aviutl.exe", base_app)];
    let mut has_app_exe = false;
    for p in &candidates_exe { if exists_file_abs(p) { has_app_exe = true; break; } }

    let mut scanned_plugins_path = String::new();
    let mut folders_plugins_set: HashSet<String> = HashSet::new();
    let mut files_plugins_set: HashSet<String> = HashSet::new();
    let dir = settings.plugins_dir.trim();
    if !dir.is_empty() {
        match list_dir_names(dir) {
            Ok((folders, files)) => {
                scanned_plugins_path = dir.to_string();
                for f in folders { folders_plugins_set.insert(f); }
                for f in files { files_plugins_set.insert(f); }
            }
            Err(e) => {
                log_error(&app, &format!("readDir failed path=\"{}\": {}", dir, e));
            }
        }
    }
    let mut scanned_scripts_path = String::new();
    let mut folders_scripts_set: HashSet<String> = HashSet::new();
    let mut files_scripts_set: HashSet<String> = HashSet::new();
    let sdir = settings.scripts_dir.trim();
    if !sdir.is_empty() {
        match list_dir_names(sdir) {
            Ok((folders, files)) => {
                scanned_scripts_path = sdir.to_string();
                for f in folders { folders_scripts_set.insert(f); }
                for f in files { files_scripts_set.insert(f); }
            }
            Err(e) => {
                log_error(&app, &format!("readDir failed path=\"{}\": {}", sdir, e));
            }
        }
    }

    let folders_plugins_vec: Vec<String> = folders_plugins_set.iter().cloned().collect();
    let files_plugins_vec: Vec<String> = files_plugins_set.iter().cloned().collect();
    let folders_scripts_vec: Vec<String> = folders_scripts_set.iter().cloned().collect();
    let files_scripts_vec: Vec<String> = files_scripts_set.iter().cloned().collect();
    log_info(&app, &format!(
        "scan appExe={} pluginsDir=\"{}\" pFolders=[{}] pFiles=[{}] scriptsDir=\"{}\" sFolders=[{}] sFiles=[{}]",
        has_app_exe,
        scanned_plugins_path,
        folders_plugins_vec.join(","),
        files_plugins_vec.join(","),
        scanned_scripts_path,
        folders_scripts_vec.join(","),
        files_scripts_vec.join(","),
    ));

    // ヘルパー：アイテムが候補かどうかを判定
    let folders_plugins_lower: HashSet<String> = folders_plugins_set.iter().map(|s| s.to_lowercase()).collect();
    let files_plugins_lower: HashSet<String> = files_plugins_set.iter().map(|s| s.to_lowercase()).collect();
    let folders_scripts_lower: HashSet<String> = folders_scripts_set.iter().map(|s| s.to_lowercase()).collect();
    let files_scripts_lower: HashSet<String> = files_scripts_set.iter().map(|s| s.to_lowercase()).collect();
    let mut is_candidate = vec![false; list.len()];
    for (idx, it) in list.iter().enumerate() {
        let mut ok = false;
        let arr_opt = it.get("versions").and_then(|v| v.as_array()).or_else(|| it.get("version").and_then(|v| v.as_array()));
        if let Some(arr) = arr_opt {
            'outer: for ver in arr {
                let files_opt = ver.get("file").and_then(|v| v.as_array());
                if files_opt.is_none() { continue; }
                let files = files_opt.unwrap();
                for f in files {
                    let p = f.get("path").and_then(|v| v.as_str()).unwrap_or("");
                    if p.is_empty() { continue; }
                    let norm = p.replace('\\', "/");
                    if norm.contains("{appDir}") && norm.rsplit('/').next().map(|s| s.to_lowercase()).unwrap_or_default().ends_with(".exe") {
                        if has_app_exe { ok = true; break 'outer; }
                    }
                    if let Some(pos) = norm.find("{pluginsDir}") {
                        let rest = &norm[pos + "{pluginsDir}".len()..];
                        let rest = rest.trim_start_matches('/');
                        let seg: Vec<&str> = rest.split('/').collect();
                        if seg.len() >= 2 {
                            if folders_plugins_lower.contains(&seg[0].to_string().to_lowercase()) { ok = true; break 'outer; }
                        } else if seg.len() == 1 && !seg[0].is_empty() {
                            if files_plugins_lower.contains(&seg[0].to_string().to_lowercase()) { ok = true; break 'outer; }
                        }
                    }
                    if let Some(pos) = norm.find("{scriptsDir}") {
                        let rest = &norm[pos + "{scriptsDir}".len()..];
                        let rest = rest.trim_start_matches('/');
                        let seg: Vec<&str> = rest.split('/').collect();
                        if seg.len() >= 2 {
                            if folders_scripts_lower.contains(&seg[0].to_string().to_lowercase()) { ok = true; break 'outer; }
                        } else if seg.len() == 1 && !seg[0].is_empty() {
                            if files_scripts_lower.contains(&seg[0].to_string().to_lowercase()) { ok = true; break 'outer; }
                        }
                    }
                }
            }
        }
        is_candidate[idx] = ok;
    }

    // すべてのユニークな絶対パスを収集
    let mut unique_paths: HashSet<String> = HashSet::new();
    for (idx, it) in list.iter().enumerate() {
        if !is_candidate[idx] { continue; }
        let arr_opt = it.get("versions").and_then(|v| v.as_array()).or_else(|| it.get("version").and_then(|v| v.as_array()));
        if let Some(arr) = arr_opt {
            for ver in arr {
                let ver_str = ver.get("version").and_then(|v| v.as_str()).unwrap_or("");
                if let Some(files) = ver.get("file").and_then(|v| v.as_array()) {
                    for f in files {
                        let raw = f.get("path").and_then(|v| v.as_str()).unwrap_or("");
                        let ctx = HashMap::from([
                            ("tmp", ""), ("appDir", settings.app_dir.as_str()), ("pluginsDir", settings.plugins_dir.as_str()),
                            ("scriptsDir", settings.scripts_dir.as_str()), ("id", it.get("id").and_then(|v| v.as_str()).unwrap_or("")), ("version", ver_str),
                            ("download", ""), ("PRODUCT_CODE", ""),
                        ]);
                        let expanded = expand_macros(raw, &ctx).replace('/', "\\");
                        let abs = if is_abs_path(&expanded) { expanded } else { to_absolute_for_check(&app, &expanded) };
                        unique_paths.insert(abs);
                    }
                }
            }
        }
    }

    // ディスクキャッシュを読み込んで再利用
    let mut disk_cache = read_hash_cache(&app);
    let mut file_hash_cache: HashMap<String, String> = HashMap::new();
    let mut to_hash: Vec<String> = Vec::new();
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

    // 残りのファイルをハッシュ計算
    for p in to_hash.iter() {
        match xxh3_file_hex_le(p) {
            Ok(hex) => { file_hash_cache.insert(p.to_lowercase(), hex); },
            Err(e) => { log_error(&app, &format!("hash error path=\"{}\": {}", p, e)); },
        }
    }
    // ディスクキャッシュを更新
    for (k, hex) in file_hash_cache.iter() {
        if let Some((mtime_ms, size)) = stat_file(k) {
            disk_cache.insert(k.clone(), serde_json::json!({"hex": hex, "mtimeMs": mtime_ms, "size": size}));
        }
    }
    write_hash_cache(&app, &disk_cache);

    // アイテムごとのバージョンを決定
    let mut out: HashMap<String, String> = HashMap::new();
    for (idx, it) in list.iter().enumerate() {
        let id = it.get("id").and_then(|v| v.as_str()).unwrap_or("").to_string();
        if id.is_empty() { continue; }
        if !is_candidate[idx] {
            out.insert(id.clone(), String::new());
            log_info(&app, &format!("detect item done id={} matched=false reason=not-candidate", id));
            continue;
        }
        let mut detected = String::new();
        let mut any_present = false;   // 探索対象ファイルが実在したか
        let mut any_mismatch = false;  // 実在したがハッシュ不一致が発生したか
        let arr_opt = it.get("versions").and_then(|v| v.as_array()).or_else(|| it.get("version").and_then(|v| v.as_array()));
        if let Some(arr) = arr_opt {
            for i in (0..arr.len()).rev() {
                let ver = &arr[i];
                let ver_str = ver.get("version").and_then(|v| v.as_str()).unwrap_or("");
                let files_opt = ver.get("file").and_then(|v| v.as_array());
                if files_opt.is_none() { continue; }
                let files = files_opt.unwrap();
                let mut ok = true;
                for f in files {
                    let raw = f.get("path").and_then(|v| v.as_str()).unwrap_or("");
                    let ctx = HashMap::from([
                        ("tmp", ""), ("appDir", settings.app_dir.as_str()), ("pluginsDir", settings.plugins_dir.as_str()),
                        ("scriptsDir", settings.scripts_dir.as_str()), ("id", id.as_str()), ("version", ver_str),
                        ("download", ""), ("PRODUCT_CODE", ""),
                    ]);
                    let expanded = expand_macros(raw, &ctx).replace('/', "\\");
                    let abs = if is_abs_path(&expanded) { expanded } else { to_absolute_for_check(&app, &expanded) };
                    let key = abs.to_lowercase();
                    let hex = file_hash_cache.get(&key).cloned().unwrap_or_default();
                    let want = f.get("XXH3_128").or_else(|| f.get("xxh3_128")).and_then(|v| v.as_str()).unwrap_or("").to_lowercase();
                    let flipped = if hex.len() == 32 {
                        // バイト単位でリバース
                        hex.as_bytes()
                            .chunks(2)
                            .rev()
                            .map(|ch| std::str::from_utf8(ch).unwrap_or("")).collect::<String>()
                    } else { hex.clone() };
                    if !hex.is_empty() { any_present = true; }
                    if !hex.is_empty() && !want.is_empty() && (hex != want && flipped != want) { any_mismatch = true; }
                    if want.is_empty() || (hex != want && flipped != want) { ok = false; break; }
                }
                if ok { detected = ver_str.to_string(); break; }
            }
        }
        if detected.is_empty() && (any_present || any_mismatch) {
            detected = String::from("???");
        }
        out.insert(id.clone(), detected.clone());
        log_info(&app, &format!("detect item done id={} matched={} version={}", id, if detected.is_empty() {"false"} else {"true"}, detected));
    }

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

// Tauriアプリケーションのメインエントリーポイント
#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        // フロントエンドで使用されるTauri v2プラグインを登録
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
  .plugin(tauri_plugin_http::init())
  .plugin(tauri_plugin_shell::init())
  .plugin(tauri_plugin_process::init())
  .setup(|app| {
      // 起動時にapp.logを最新1000行に削減
      let _ = prune_app_log(&app.handle(), 1000);
      // アップデータープラグイン（デスクトップ）
      #[cfg(desktop)]
      {
          app.handle().plugin(tauri_plugin_updater::Builder::new().build())?;
      }
      Ok(())
  })
  .invoke_handler(tauri::generate_handler![
            xxh3_128_hex,
            xxh3_file_hex,
            xxh3_many,
            set_catalog_index,
            query_catalog_index,
            extract_zip,
            detect_versions_map,
            log_info_cmd,
            log_error_cmd,
            get_installed_map_cmd,
            add_installed_id_cmd,
            remove_installed_id_cmd,
            list_installed_plugins,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}

// -----------------------
// インストール済みプラグイン/スクリプトファイルのリスト表示（再帰的）


#[tauri::command]
fn list_installed_plugins(app: tauri::AppHandle) -> Result<Vec<String>, String> {
    use std::collections::BTreeSet;
    use std::ffi::OsStr;
    use std::fs;
    use std::path::{Path, PathBuf};

    let settings = read_settings(&app);
    let mut roots: Vec<String> = Vec::new();
    if !settings.plugins_dir.is_empty() { roots.push(settings.plugins_dir.clone()); }
    if !settings.scripts_dir.is_empty() { roots.push(settings.scripts_dir.clone()); }
    if roots.is_empty() { return Ok(Vec::new()); }

    // ファイル拡張子をチェックする関数
    fn has_ext(p: &Path, exts: &[&str]) -> bool {
        match p.extension().and_then(OsStr::to_str) {
            Some(ext) => {
                let lower = ext.to_lowercase();
                exts.iter().any(|e| *e == format!(".{lower}"))
            }
            None => false,
        }
    }

    // 再帰的にディレクトリを探索してファイルを収集
    fn list_recursive(dir: &Path, out: &mut Vec<PathBuf>) {
        if let Ok(read) = fs::read_dir(dir) {
            for ent in read.flatten() {
                let path = ent.path();
                if let Ok(ft) = ent.file_type() {
                    if ft.is_dir() {
                        list_recursive(&path, out);
                    } else if has_ext(&path, &[".auf", ".aui", ".dll", ".lua", ".anm"]) {
                        out.push(path);
                    }
                }
            }
        }
    }

    // 重複を排除するためのBTreeSetを使用
    let mut set = BTreeSet::<String>::new();
    for r in roots {
        let path = PathBuf::from(&r);
        let mut files = Vec::new();
        list_recursive(&path, &mut files);
        for f in files {
            let name = f.file_name().and_then(OsStr::to_str).unwrap_or("").to_string();
            let parent = f.parent().and_then(|p| p.file_name()).and_then(OsStr::to_str).unwrap_or("").to_string();
            if !name.is_empty() {
                let label = if parent.is_empty() { name } else { format!("{} / {}", parent, name) };
                set.insert(label);
            }
        }
    }
    Ok(set.into_iter().collect())
}
