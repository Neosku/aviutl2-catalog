use tauri::Manager;

mod commands;
mod paths;

fn app_config_dir(app: &tauri::AppHandle) -> std::path::PathBuf {
    app.path().app_config_dir().unwrap_or_else(|_| std::env::temp_dir())
}

fn log_line(app: &tauri::AppHandle, level: &str, msg: &str) {
    use chrono::Local;
    use std::fs::{create_dir_all, OpenOptions};
    use std::io::Write;
    let file = app_config_dir(app).join("logs/app.log");
    let _ = create_dir_all(file.parent().unwrap());
    let ts = Local::now().format("%Y-%m-%d %H:%M:%S%.3f");
    let line = format!("[{}] [{}] {}\n", ts, level, msg);
    if let Ok(mut f) = OpenOptions::new().create(true).append(true).open(file) {
        let _ = f.write_all(line.as_bytes());
    }
}

fn log_info(app: &tauri::AppHandle, msg: &str) {
    log_line(app, "INFO", msg);
}

fn log_error(app: &tauri::AppHandle, msg: &str) {
    log_line(app, "ERROR", msg);
}

fn prune_log_file(app: &tauri::AppHandle, max_lines: usize) -> Result<(), String> {
    let file = app_config_dir(app).join("logs/app.log");
    if !file.exists() {
        return Ok(());
    }
    let text = match std::fs::read_to_string(&file) {
        Ok(t) => t,
        Err(_) => return Ok(()),
    };
    let lines: Vec<&str> = text.lines().collect();
    if lines.len() <= max_lines {
        return Ok(());
    }
    let start = lines.len() - max_lines;
    let _ = std::fs::write(&file, lines[start..].join("\n") + "\n");
    Ok(())
}

fn init_app(app: &tauri::AppHandle) -> Result<(), String> {
    prune_log_file(app, 1000)?;
    Ok(())
}

fn installed_file_path(app: &tauri::AppHandle) -> std::path::PathBuf {
    app_config_dir(app).join("installed.json")
}

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
                    for (k, vv) in obj {
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

pub fn run() {
    let mut builder = tauri::Builder::default();

    #[cfg(target_os = "windows")]
    {
        builder = builder.plugin(tauri_plugin_single_instance::init(|_app, _argv, _cwd| {}));
    }

    builder
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
                if let Some(booth) = window.app_handle().get_webview_window("booth-auth") {
                    let _ = booth.close();
                }
            }
        })
        .setup(|app| {
            #[cfg(all(debug_assertions, target_os = "windows"))]
            {
                use tauri_plugin_deep_link::DeepLinkExt;
                app.deep_link().register_all().map_err(|e| std::io::Error::other(e.to_string()))?;
            }

            paths::init_settings(app.handle())?;
            let _ = init_app(app.handle());
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            commands::catalog::set_catalog_index,
            commands::catalog::query_catalog_index,
            commands::archive::extract_zip,
            commands::archive::extract_7z_sfx,
            commands::version::detect_versions_map,
            commands::logging::log_cmd,
            commands::version::calc_xxh3_hex,
            commands::installed::get_installed_map_cmd,
            commands::installed::add_installed_id_cmd,
            commands::installed::remove_installed_id_cmd,
            commands::download::drive_download_to_file,
            commands::download::download_file_to_path,
            commands::download::download_file_to_path_booth,
            commands::download::ensure_booth_auth_window,
            commands::download::close_booth_auth_window,
            commands::version::expand_macros,
            commands::archive::copy_item_js,
            commands::system::is_aviutl_running,
            commands::system::launch_aviutl2,
            commands::system::run_auo_setup,
            paths::complete_initial_setup,
            paths::update_settings,
            paths::default_aviutl2_root,
            paths::resolve_aviutl2_root,
            paths::get_app_dirs,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
