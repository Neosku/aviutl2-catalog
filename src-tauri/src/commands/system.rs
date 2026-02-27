use std::{
    path::PathBuf,
    thread,
    time::{Duration, Instant},
};

use tauri::{AppHandle, Manager};
use windows::{
    Win32::Foundation::{HWND, LPARAM, WPARAM},
    Win32::UI::WindowsAndMessaging::{
        FindWindowExW, GW_HWNDNEXT, GetClassNameW, GetDlgItem, GetTopWindow, GetWindow, GetWindowThreadProcessId, PostMessageW, SendMessageW, WM_CLOSE, WM_GETTEXT,
        WM_GETTEXTLENGTH,
    },
    core::{PCWSTR, w},
};

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

fn run_auo_setup_impl(_app: AppHandle, exe_path: PathBuf, args: Option<Vec<String>>) -> Result<i32, String> {
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

#[tauri::command]
pub fn is_aviutl_running() -> bool {
    use sysinfo::System;
    let sys = System::new_all();
    sys.processes().values().any(|proc| proc.name().eq_ignore_ascii_case("aviutl2.exe"))
}

#[tauri::command]
pub fn launch_aviutl2(_app: tauri::AppHandle) -> Result<(), String> {
    let dirs = crate::paths::dirs();
    let exe_path = dirs.aviutl2_root.join("aviutl2.exe");
    if !exe_path.exists() {
        return Err(format!("aviutl2.exe が見つかりませんでした: {}", exe_path.display()));
    }

    std::process::Command::new(&exe_path).current_dir(&dirs.aviutl2_root).spawn().map_err(|e| format!("起動に失敗しました: {}", e))?;

    tracing::info!("Launched AviUtl2: {}", exe_path.display());
    Ok(())
}

#[tauri::command]
pub async fn run_auo_setup(app: AppHandle, exe_path: String) -> Result<i32, String> {
    let exe_path = PathBuf::from(exe_path);
    let exe_path = std::fs::canonicalize(exe_path).map_err(|e| e.to_string())?;
    let settings = {
        let config_dir = app.path().app_config_dir().map_err(|e| e.to_string())?;
        let settings_path = config_dir.join("settings.json");
        crate::paths::Settings::load_from_file(&settings_path)
    };
    let mut args_vec = Vec::new();
    if settings.is_portable_mode {
        tracing::info!("Running in portable mode");
        let core_installed = crate::read_installed_map(&app).get("Kenkun.AviUtlExEdit2").map(|s| !s.trim().is_empty()).unwrap_or(false);
        if !core_installed {
            let msg = String::from("Kenkun.AviUtlExEdit2 がインストールされていません。インストール後に再度実行してください。");
            tracing::error!("{}", msg);
            return Err(msg);
        }
        if settings.aviutl2_root.as_os_str().is_empty() {
            let msg = String::from("settings.json に AviUtl2 のルートフォルダが設定されていません。");
            tracing::error!("{}", msg);
            return Err(msg);
        }
        let root_arg = settings.aviutl2_root.to_string_lossy().to_string();
        args_vec.push("-aviutldir".to_string());
        args_vec.push(root_arg);
    } else {
        tracing::info!("Running in standard mode");
        args_vec.push("-aviutldir-default".to_string());
    }
    let args = if args_vec.is_empty() { None } else { Some(args_vec) };
    let app_for_task = app.clone();
    tauri::async_runtime::spawn_blocking(move || run_auo_setup_impl(app_for_task, exe_path, args)).await.map_err(|e| e.to_string())?
}
