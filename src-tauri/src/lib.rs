use tauri::Manager;
use tracing_subscriber::fmt::writer::MakeWriterExt;

mod commands;
mod paths;

fn app_config_dir(app: &tauri::AppHandle) -> std::path::PathBuf {
    app.path().app_config_dir().expect("Failed to get app config directory")
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
    let p = installed_file_path(app);
    let text = match std::fs::read_to_string(&p) {
        Ok(v) => v,
        Err(_) => return std::collections::HashMap::new(),
    };
    serde_json::from_str::<std::collections::HashMap<String, String>>(&text).unwrap_or_default()
}

fn write_installed_map(app: &tauri::AppHandle, map: &std::collections::HashMap<String, String>) -> Result<(), String> {
    use std::fs::{File, create_dir_all};
    use std::io::Write;
    let base = app_config_dir(app);
    let _ = create_dir_all(&base);
    let p = installed_file_path(app);
    let mut f = File::create(&p).map_err(|e| e.to_string())?;
    f.write_all(serde_json::to_string_pretty(map).unwrap().as_bytes()).map_err(|e| e.to_string())?;
    Ok(())
}

fn init_logger(app: &tauri::AppHandle) {
    // TODO: もっといい書き方がありそう
    static LOG_FILE: std::sync::OnceLock<std::path::PathBuf> = std::sync::OnceLock::new();
    let log_file = app_config_dir(app).join("logs/app.log");
    if let Some(parent) = log_file.parent() {
        std::fs::create_dir_all(parent).unwrap_or_else(|e| panic!("Failed to create log directory {}: {}", parent.display(), e));
    }
    LOG_FILE.get_or_init(|| log_file.clone());

    let stdout = std::io::stdout.with_max_level(tracing::Level::INFO);

    let file = tracing_subscriber::fmt::writer::BoxMakeWriter::new(|| {
        let log_file = LOG_FILE.get().expect("LOG_FILE should be initialized");
        let file = std::fs::OpenOptions::new().create(true).append(true).open(log_file).unwrap_or_else(|e| panic!("Failed to open log file {}: {}", log_file.display(), e));
        strip_ansi_escapes::Writer::new(file)
    })
    .with_max_level(tracing::Level::INFO);

    let writer = stdout.and(file);

    tracing_subscriber::fmt().with_max_level(tracing::Level::INFO).with_writer(writer).init();
}

#[cfg(target_os = "windows")]
fn bring_existing_window_to_front(app: &tauri::AppHandle) {
    let Some(window) = app.get_webview_window("main").or_else(|| app.get_webview_window("init-setup")) else {
        return;
    };
    let _ = window.unminimize();
    let _ = window.show();
    let _ = window.set_focus();
}

pub fn run() {
    let mut builder = tauri::Builder::default();

    #[cfg(all(target_os = "windows", not(debug_assertions)))]
    {
        builder = builder.plugin(tauri_plugin_single_instance::init(|app, _argv, _cwd| {
            bring_existing_window_to_front(app);
        }));
    }

    builder
        .plugin(tauri_plugin_deep_link::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_http::init())
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_process::init())
        .plugin(tauri_plugin_updater::Builder::new().build())
        .plugin(tauri_plugin_window_state::Builder::new().build())
        .on_window_event(|window, event| {
            if window.label() != "main" {
                return;
            }
            if matches!(event, tauri::WindowEvent::CloseRequested { .. })
                && let Some(booth) = window.app_handle().get_webview_window("booth-auth")
            {
                let _ = booth.close();
            }
        })
        .setup(|app| {
            init_logger(app.handle());

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
            commands::system::run_installer_executable,
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
