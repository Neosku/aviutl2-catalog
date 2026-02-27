use std::fs::{self, File};
use std::io::{self, Cursor};
use std::path::{Path, PathBuf};

use memchr::memmem::Finder;
use memmap2::MmapOptions;
use sevenz_rust2::{Password, decompress_with_extract_fn_and_password, default_entry_extract_fn};
use walkdir::WalkDir;
use zip::read::ZipArchive;

#[tauri::command]
pub fn extract_zip(_app: tauri::AppHandle, zip_path: String, dest_path: String) -> Result<(), String> {
    let file = File::open(&zip_path).map_err(|e| format!("open zip error: {}", e))?;
    let mut archive = ZipArchive::new(file).map_err(|e| format!("zip open error: {}", e))?;
    archive.extract(Path::new(&dest_path)).map_err(|e| format!("extract error: {}", e))?;
    Ok(())
}

#[tauri::command]
pub async fn extract_7z_sfx(_: tauri::AppHandle, sfx_path: String, dest_path: String) -> Result<(), String> {
    tauri::async_runtime::spawn_blocking(move || -> Result<(), String> {
        const SIGNATURE: &[u8] = b"\x37\x7A\xBC\xAF\x27\x1C";
        let file = File::open(Path::new(&sfx_path)).map_err(|e| format!("open sfx error: {e}"))?;
        let mmap = unsafe { MmapOptions::new().map(&file) }.map_err(|e| format!("mmap error: {e}"))?;
        let offset = Finder::new(SIGNATURE).find(&mmap).ok_or_else(|| "7z signature not found in SFX binary".to_string())?;
        let cursor = Cursor::new(&mmap[offset..]);
        decompress_with_extract_fn_and_password(cursor, Path::new(&dest_path), Password::empty(), default_entry_extract_fn).map_err(|e| format!("7z decompress error: {e}"))?;
        Ok(())
    })
    .await
    .map_err(|e| format!("task join error: {e}"))?
}

fn copy_item(src: &Path, dst: &Path) -> io::Result<usize> {
    let mut count = 0;
    if src.is_file() {
        fs::create_dir_all(dst)?;
        let file_name = src.file_name().ok_or_else(|| io::Error::other("Failed to get file name"))?;
        let dest_path = dst.join(file_name);
        fs::copy(src, dest_path)?;
        count += 1;
        return Ok(count);
    }
    if src.is_dir() {
        fs::create_dir_all(dst)?;
        for entry in WalkDir::new(src) {
            let entry = entry?;
            let path = entry.path();
            let rel = path.strip_prefix(src).map_err(|_| io::Error::other("Failed to calculate relative path"))?;
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

    Err(io::Error::other("Source is neither a file nor a directory"))
}

#[tauri::command]
pub fn copy_item_js(src_str: String, dst_str: String) -> Result<usize, String> {
    let src = PathBuf::from(src_str);
    let dst = PathBuf::from(dst_str);
    copy_item(&src, &dst).map_err(|e| e.to_string())
}
