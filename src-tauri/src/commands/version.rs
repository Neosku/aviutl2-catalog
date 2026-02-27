use std::collections::{HashMap, HashSet};
use std::path::Path;

use tauri::Manager;
use xxhash_rust::xxh3::xxh3_128;

fn xxh3_128_hex<P: AsRef<Path>>(path: P) -> Result<String, String> {
    let buf = std::fs::read(path).map_err(|e| format!("open/read error: {}", e))?;
    let h = xxh3_128(&buf);
    Ok(format!("{:032x}", h))
}

fn is_abs(p: &str) -> bool {
    let s = p.replace('\\', "/");
    s.starts_with('/') || (s.len() >= 3 && s.as_bytes()[1] == b':' && (s.as_bytes()[2] == b'/' || s.as_bytes()[2] == b'\\'))
}

fn read_hash_cache(app: &tauri::AppHandle) -> HashMap<String, serde_json::Value> {
    use std::fs::File;
    use std::io::Read;
    let mut map = HashMap::new();
    let path = app.path().app_config_dir().unwrap_or_else(|_| std::env::temp_dir()).join("hash-cache.json");
    if let Ok(mut f) = File::open(&path) {
        let mut s = String::new();
        if f.read_to_string(&mut s).is_ok() {
            if let Ok(v) = serde_json::from_str::<serde_json::Value>(&s) {
                if let Some(obj) = v.as_object() {
                    for (k, vv) in obj {
                        map.insert(k.clone(), vv.clone());
                    }
                }
            }
        }
    }
    map
}

fn write_hash_cache(app: &tauri::AppHandle, cache: &HashMap<String, serde_json::Value>) {
    use std::fs::{create_dir_all, File};
    use std::io::Write;
    let base = app.path().app_config_dir().unwrap_or_else(|_| std::env::temp_dir());
    let _ = create_dir_all(&base);
    let path = base.join("hash-cache.json");
    if let Ok(mut f) = File::create(&path) {
        let _ = f.write_all(serde_json::to_string_pretty(cache).unwrap_or_else(|_| "{}".into()).as_bytes());
    }
}

fn stat_file(path: &str) -> Option<(u128, u64)> {
    use std::time::UNIX_EPOCH;
    let md = std::fs::metadata(path).ok()?;
    let size = md.len();
    let mtime = md.modified().ok()?.duration_since(UNIX_EPOCH).ok()?.as_millis();
    Some((mtime, size))
}

#[tauri::command]
pub fn calc_xxh3_hex(path: String) -> Result<String, String> {
    xxh3_128_hex(path)
}

#[tauri::command]
pub fn expand_macros(raw_path: &str) -> String {
    let dirs = crate::paths::dirs();
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

fn collect_unique_paths(_app: &tauri::AppHandle, list: &[serde_json::Value]) -> Result<HashSet<String>, String> {
    tracing::info!("Collecting unique paths for version check...");
    let mut unique_paths = HashSet::new();
    for it in list {
        let arr_opt = it.get("versions").and_then(|v| v.as_array()).or_else(|| it.get("version").and_then(|v| v.as_array()));
        if let Some(arr) = arr_opt {
            for ver in arr {
                if let Some(files) = ver.get("file").and_then(|v| v.as_array()) {
                    for f in files {
                        let raw = f.get("path").and_then(|v| v.as_str()).unwrap_or("");
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
    tracing::info!("Collected {} unique paths for version check.", unique_paths.len());
    Ok(unique_paths)
}

fn build_file_hash_cache(app: &tauri::AppHandle, unique_paths: &HashSet<String>) -> HashMap<String, String> {
    tracing::info!("Building file hash cache...");
    let mut disk_cache = read_hash_cache(app);
    let mut file_hash_cache = HashMap::new();
    let mut to_hash = Vec::new();
    for path in unique_paths {
        let key = path.to_string();
        if let Some((mtime_ms, size)) = stat_file(path) {
            if let Some(v) = disk_cache.get(&key) {
                let hex = v.get("xxh3_128").and_then(|x| x.as_str()).unwrap_or("");
                let m = v.get("mtimeMs").and_then(|x| x.as_u64()).or_else(|| v.get("mtimeMs").and_then(|x| x.as_i64().map(|y| y as u64))).unwrap_or(0) as u128;
                let sz = v.get("size").and_then(|x| x.as_u64()).unwrap_or(0);
                if !hex.is_empty() && m == mtime_ms && sz == size {
                    file_hash_cache.insert(key.clone(), hex.to_string());
                    continue;
                }
            }
            to_hash.push(key.clone());
        }
    }

    for path_str in &to_hash {
        match xxh3_128_hex(path_str) {
            Ok(hex) => {
                file_hash_cache.insert(path_str.clone(), hex);
            }
            Err(e) => {
                tracing::error!("hash error path=\"{}\": {}", path_str, e);
            }
        }
    }
    for (k, hex) in &file_hash_cache {
        if let Some((mtime_ms, size)) = stat_file(k) {
            let mtime_ms_u64 = mtime_ms as u64;
            disk_cache.insert(k.clone(), serde_json::json!({"xxh3_128": hex, "mtimeMs": mtime_ms_u64, "size": size}));
        }
    }
    write_hash_cache(app, &disk_cache);
    tracing::info!("Built file hash cache with {} entries.", file_hash_cache.len());
    file_hash_cache
}

fn determine_versions(_app: &tauri::AppHandle, list: &[serde_json::Value], file_hash_cache: &HashMap<String, String>) -> HashMap<String, String> {
    let mut out = HashMap::new();
    tracing::info!("Detecting installed versions...");
    for it in list {
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
                if files_opt.is_none() || files_opt.as_ref().is_some_and(|v| v.is_empty()) {
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
        out.insert(id, detected);
    }
    tracing::info!("detect all done count={},files={:?}", list.len(), out);
    out
}

#[tauri::command]
pub fn detect_versions_map(app: tauri::AppHandle, items: Vec<serde_json::Value>) -> Result<HashMap<String, String>, String> {
    let list = items;
    tracing::info!("detect map start count={}", list.len());
    let unique_paths = collect_unique_paths(&app, &list)?;
    let file_hash_cache = build_file_hash_cache(&app, &unique_paths);
    let out = determine_versions(&app, &list, &file_hash_cache);
    Ok(out)
}
