use std::collections::{HashMap, HashSet};
use std::path::Path;

use serde::Deserialize;
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

#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
#[serde(tag = "version", content = "data")]
enum HashCacheRoot {
    #[serde(rename = "1")]
    V1(HashMap<std::path::PathBuf, HashCacheEntry>),
}

#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
struct HashCacheV0Entry {
    xxh3_128: String,
    #[serde(rename = "mtimeMs")]
    mtime_ms: u128,
    size: u64,
}

#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
#[serde(untagged)]
enum HashCacheFile {
    Versioned(HashCacheRoot),
    Unversioned(HashMap<std::path::PathBuf, HashCacheV0Entry>),
}

#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
struct HashCacheEntry {
    xxh3_128: String,
    mtime_ms: u128,
    size: u64,
}

#[derive(Debug, Clone, Deserialize)]
pub struct VersionFileInput {
    #[serde(default)]
    path: String,
    #[serde(default, alias = "XXH3_128")]
    xxh3_128: String,
}

#[derive(Debug, Clone, Deserialize)]
pub struct VersionEntryInput {
    #[serde(default)]
    version: String,
    #[serde(default)]
    file: Vec<VersionFileInput>,
}

#[derive(Debug, Clone, Deserialize)]
pub struct VersionItemInput {
    #[serde(default)]
    id: String,
    #[serde(default, alias = "version")]
    versions: Vec<VersionEntryInput>,
}

fn read_hash_cache(app: &tauri::AppHandle) -> HashMap<std::path::PathBuf, HashCacheEntry> {
    return match read_hash_cache_impl(app) {
        Ok(map) => map,
        Err(e) => {
            tracing::error!("Failed to read hash cache: {}", e);
            HashMap::new()
        }
    };

    fn read_hash_cache_impl(app: &tauri::AppHandle) -> anyhow::Result<HashMap<std::path::PathBuf, HashCacheEntry>> {
        use std::fs::File;

        let path = app.path().app_config_dir().unwrap_or_else(|_| std::env::temp_dir()).join("hash-cache.json");
        let f = File::open(&path)?;
        let cache_file: HashCacheFile = serde_json::from_reader(f)?;
        match cache_file {
            HashCacheFile::Versioned(HashCacheRoot::V1(map)) => Ok(map),
            HashCacheFile::Unversioned(v0_map) => Ok(v0_map.into_iter().map(|(k, v)| (k, HashCacheEntry { xxh3_128: v.xxh3_128, mtime_ms: v.mtime_ms, size: v.size })).collect()),
        }
    }
}

fn write_hash_cache(app: &tauri::AppHandle, cache: &HashMap<std::path::PathBuf, HashCacheEntry>) {
    use std::fs::{File, create_dir_all};
    use std::io::Write;
    let base = app.path().app_config_dir().unwrap_or_else(|_| std::env::temp_dir());
    let _ = create_dir_all(&base);
    let path = base.join("hash-cache.json");
    if let Ok(mut f) = File::create(&path) {
        let cache_file = HashCacheFile::Versioned(HashCacheRoot::V1(cache.clone()));
        if let Ok(json) = serde_json::to_string_pretty(&cache_file) {
            if let Err(e) = f.write_all(json.as_bytes()) {
                tracing::error!("Failed to write hash cache: {}", e);
            }
        } else {
            tracing::error!("Failed to serialize hash cache");
        }
    }
}

fn stat_file(path: &std::path::Path) -> Option<(u128, u64)> {
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

fn collect_unique_paths(_app: &tauri::AppHandle, list: &[VersionItemInput]) -> Result<HashSet<std::path::PathBuf>, String> {
    tracing::info!("Collecting unique paths for version check...");
    let mut unique_paths = HashSet::new();
    for it in list {
        for ver in &it.versions {
            for f in &ver.file {
                let raw = f.path.as_str();
                let expanded = expand_macros(raw).replace('/', "\\");
                if !is_abs(&expanded) {
                    return Err(format!("version.file.path must be an absolute path after macro expansion: {}", raw));
                }
                unique_paths.insert(std::path::PathBuf::from(expanded));
            }
        }
    }
    tracing::info!("Collected {} unique paths for version check.", unique_paths.len());
    Ok(unique_paths)
}

fn build_file_hash_cache(app: &tauri::AppHandle, unique_paths: &HashSet<std::path::PathBuf>) -> HashMap<std::path::PathBuf, String> {
    tracing::info!("Building file hash cache...");
    let mut disk_cache = read_hash_cache(app);
    let mut file_hash_cache = HashMap::new();
    let mut to_hash = Vec::new();
    for path in unique_paths {
        if let Some((mtime_ms, size)) = stat_file(path) {
            if let Some(entry) = disk_cache.get(path)
                && entry.mtime_ms == mtime_ms
                && entry.size == size
                && entry.xxh3_128.len() == 32
            {
                file_hash_cache.insert(path.clone(), entry.xxh3_128.clone());
                continue;
            }
            to_hash.push(path.clone());
        }
    }

    for path_str in &to_hash {
        match xxh3_128_hex(path_str) {
            Ok(hex) => {
                file_hash_cache.insert(path_str.clone(), hex);
            }
            Err(e) => {
                tracing::error!("hash error path=\"{}\": {}", path_str.display(), e);
            }
        }
    }
    for (k, hex) in &file_hash_cache {
        if let Some((mtime_ms, size)) = stat_file(k) {
            disk_cache.insert(k.clone(), HashCacheEntry { xxh3_128: hex.clone(), mtime_ms, size });
        }
    }
    write_hash_cache(app, &disk_cache);
    tracing::info!("Built file hash cache with {} entries.", file_hash_cache.len());
    file_hash_cache
}

fn determine_versions(_app: &tauri::AppHandle, list: &[VersionItemInput], file_hash_cache: &HashMap<std::path::PathBuf, String>) -> HashMap<String, String> {
    let mut out = HashMap::new();
    tracing::info!("Detecting installed versions...");
    for it in list {
        let id = it.id.clone();
        if id.is_empty() {
            continue;
        }
        let mut detected = String::new();
        let mut any_present = false;
        let mut any_mismatch = false;
        for ver in it.versions.iter().rev() {
            if ver.file.is_empty() {
                continue;
            }
            let mut ok = true;
            for f in &ver.file {
                let raw = f.path.as_str();
                let expanded = expand_macros(raw).replace('/', "\\");
                let key = std::path::PathBuf::from(expanded);
                let found_hex = file_hash_cache.get(&key).cloned().unwrap_or_default();
                let want_hex = f.xxh3_128.as_str();
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
                detected = ver.version.clone();
                break;
            }
        }
        if detected.is_empty() && (any_present || any_mismatch) {
            detected = String::from("???");
        }
        out.insert(id, detected);
    }
    tracing::info!("detect all done count={}", list.len());
    out
}

#[tauri::command]
pub fn detect_versions_map(app: tauri::AppHandle, items: Vec<VersionItemInput>) -> Result<HashMap<String, String>, String> {
    let list = items;
    tracing::info!("detect map start count={}", list.len());
    let unique_paths = collect_unique_paths(&app, &list)?;
    let file_hash_cache = build_file_hash_cache(&app, &unique_paths);
    let out = determine_versions(&app, &list, &file_hash_cache);
    Ok(out)
}
