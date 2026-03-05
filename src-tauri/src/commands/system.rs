use std::{
    iter::once,
    mem::size_of,
    os::windows::ffi::OsStrExt,
    path::PathBuf,
    thread,
    time::{Duration, Instant},
};

use tauri::{AppHandle, Manager};
use windows::{
    Win32::{
        Foundation::{CloseHandle, HANDLE, HWND, LPARAM, WAIT_FAILED, WPARAM},
        System::Threading::{GetExitCodeProcess, INFINITE, WaitForSingleObject},
        UI::{
            Shell::{SEE_MASK_NOCLOSEPROCESS, SHELLEXECUTEINFOW, ShellExecuteExW},
            WindowsAndMessaging::{
                FindWindowExW, GW_HWNDNEXT, GetClassNameW, GetDlgItem, GetTopWindow, GetWindow, GetWindowThreadProcessId, PostMessageW, SW_SHOWNORMAL, SendMessageW, WM_CLOSE,
                WM_GETTEXT, WM_GETTEXTLENGTH,
            },
        },
    },
    core::{PCWSTR, w},
};

struct OwnedProcessHandle(HANDLE);

impl Drop for OwnedProcessHandle {
    fn drop(&mut self) {
        if !self.0.0.is_null() {
            unsafe {
                let _ = CloseHandle(self.0);
            }
        }
    }
}

fn os_str_to_wide(value: &std::ffi::OsStr) -> Vec<u16> {
    value.encode_wide().chain(once(0)).collect()
}

fn str_to_wide(value: &str) -> Vec<u16> {
    value.encode_utf16().chain(once(0)).collect()
}

fn wait_for_process_exit(handle: OwnedProcessHandle) -> Result<u32, String> {
    let wait_result = unsafe { WaitForSingleObject(handle.0, INFINITE) };
    if wait_result == WAIT_FAILED {
        return Err(format!("WaitForSingleObject failed: {}", std::io::Error::last_os_error()));
    }

    let mut exit_code = 0u32;
    unsafe {
        GetExitCodeProcess(handle.0, &mut exit_code).map_err(|e| format!("GetExitCodeProcess failed: {e}"))?;
    }
    Ok(exit_code)
}

fn run_installer_executable_impl(exe_path: PathBuf, args: Vec<String>, elevate: bool) -> Result<(), String> {
    if !exe_path.is_absolute() {
        return Err(format!("Installer path must be absolute: {}", exe_path.display()));
    }
    if !exe_path.is_file() {
        return Err(format!("Installer file not found: {}", exe_path.display()));
    }
    let file_wide = os_str_to_wide(exe_path.as_os_str());
    let params = args.join(" ");
    let params_wide = (!params.is_empty()).then(|| str_to_wide(&params));
    let verb_wide = elevate.then(|| str_to_wide("runas"));
    let dir_wide = os_str_to_wide(exe_path.parent().ok_or_else(|| format!("Installer path has no parent directory: {}", exe_path.display()))?.as_os_str());

    let mut exec_info = SHELLEXECUTEINFOW {
        cbSize: size_of::<SHELLEXECUTEINFOW>() as u32,
        fMask: SEE_MASK_NOCLOSEPROCESS,
        lpVerb: verb_wide.as_ref().map_or(PCWSTR::null(), |v| PCWSTR(v.as_ptr())),
        lpFile: PCWSTR(file_wide.as_ptr()),
        lpParameters: params_wide.as_ref().map_or(PCWSTR::null(), |v| PCWSTR(v.as_ptr())),
        lpDirectory: PCWSTR(dir_wide.as_ptr()),
        nShow: SW_SHOWNORMAL.0,
        ..Default::default()
    };

    unsafe {
        ShellExecuteExW(&mut exec_info).map_err(|e| format!("Failed to start '{}': {e}", exe_path.display()))?;
    }

    if exec_info.hProcess.0.is_null() {
        return Err(format!("Process handle was not returned for '{}'", exe_path.display()));
    }

    let exit_code = wait_for_process_exit(OwnedProcessHandle(exec_info.hProcess))?;
    if exit_code != 0 {
        return Err(format!(
            "runInstallerExecutable failed (exe={}, args={}, elevate={}) exit={exit_code}",
            exe_path.display(),
            serde_json::to_string(&args).unwrap_or_else(|_| String::from("[]")),
            elevate
        ));
    }
    Ok(())
}

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

fn run_auo_setup_impl(exe_path: PathBuf, args: Vec<String>) -> Result<i32, String> {
    let mut cmd = std::process::Command::new(&exe_path);
    cmd.args(&args);
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
pub fn launch_aviutl2() -> Result<(), String> {
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
pub async fn run_installer_executable(exe_path: String, args: Vec<String>, elevate: bool) -> Result<(), String> {
    let exe_path = PathBuf::from(exe_path);
    tauri::async_runtime::spawn_blocking(move || run_installer_executable_impl(exe_path, args, elevate)).await.map_err(|e| e.to_string())?
}

#[tauri::command]
pub async fn run_auo_setup(app: AppHandle, exe_path: String) -> Result<i32, String> {
    let exe_path = PathBuf::from(exe_path);
    let exe_path = std::fs::canonicalize(exe_path).map_err(|e| e.to_string())?;
    if !exe_path.is_file() {
        return Err(format!("Installer file not found: {}", exe_path.display()));
    }
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
    tauri::async_runtime::spawn_blocking(move || run_auo_setup_impl(exe_path, args_vec)).await.map_err(|e| e.to_string())?
}
