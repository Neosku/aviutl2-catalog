use arc_swap::ArcSwap;
use once_cell::sync::OnceCell;
use serde::{Deserialize, Serialize};
use std::sync::Arc;
use std::{
    fs,
    io::{Error, ErrorKind},
    path::{Path, PathBuf},
};
use tauri::{AppHandle, Manager, WebviewUrl, WebviewWindowBuilder};

static APP_DIR: OnceCell<ArcSwap<AppDirs>> = OnceCell::new();

fn pathbuf_to_string(path: &PathBuf) -> String {
    path.to_string_lossy().into_owned()
}

// settings.jsonから読み込む項目
#[derive(Debug, Clone, Serialize, Deserialize, Default)]
#[serde(default)]
pub struct Settings {
    pub aviutl2_root: PathBuf,     // AviUtl2 のルートディレクトリ
    pub is_portable_mode: bool,    // ポータブルモードかどうか
    pub theme: String,             // テーマ
    pub package_state_opt_out: bool, // 匿名統計の送信を無効化する
    pub app_version: String,       // 本アプリのバージョン(UpdateCheckerの更新で使用)
    pub catalog_exe_path: PathBuf, // 本ソフトの実行ファイルのパス(UpdateCheckerで使用))
}

// アプリケーションで使用するディレクトリ一覧
#[derive(Debug, Serialize, Clone)]
pub struct AppDirs {
    // aviutl2関係
    pub aviutl2_root: PathBuf, // AviUtl2 のルートディレクトリ(c://Program Files/aviutl2 or その他)
    pub aviutl2_data: PathBuf, // AviUtl2 の data ディレクトリ(c://ProgramData/aviutl2 or aviutl2_root/data)
    pub plugin_dir: PathBuf,
    pub script_dir: PathBuf,
    // 本ソフト関係
    pub catalog_exe_dir: PathBuf,    // 本ソフトの実行ファイルのあるディレクトリ
    pub catalog_config_dir: PathBuf, // 本ソフトの設定ファイルのあるディレクトリ
    pub log_path: PathBuf,           // ログファイルのパス(しばらく未使用)
}

// setting.json関係の関数
impl Settings {
    /// JSONを読み込む（無いときはデフォルトを返す）
    pub fn load_from_file(path: impl AsRef<Path>) -> Self {
        fs::read_to_string(path).ok().and_then(|s| serde_json::from_str(&s).ok()).unwrap_or_default()
    }

    /// JSONに保存
    pub fn save_to_file(&self, path: impl AsRef<Path>) -> std::io::Result<()> {
        fs::create_dir_all(path.as_ref().parent().unwrap_or(Path::new(".")))?;
        fs::write(path, serde_json::to_string_pretty(self)?)
    }
}

// 起動時初期化
// 流れ：setting.jsonからファイルを読み込み→app_dirがない場合は初期設定→パスを登録→現在のバージョンを取得し比較→updateCheckerの移動の可否を決定
pub fn init_settings(app: &AppHandle) -> std::io::Result<()> {
    use std::fs::create_dir_all;
    use std::path::PathBuf;

    let catalog_config_dir: PathBuf = app.path().app_config_dir().unwrap_or_else(|err| {
        crate::log_error(app, &format!("Failed to get catalog_config_dir: {err}"));
        std::process::exit(1);
    });
    let _ = create_dir_all(&catalog_config_dir);
    let settings_path = catalog_config_dir.join("settings.json");

    let mut settings: Settings = Settings::load_from_file(&settings_path);
    crate::log_info(app, &format!("Loaded settings: {:?}", settings));

    if settings.aviutl2_root.as_os_str().is_empty() {
        crate::log_info(app, "settings.json not found — opening setup window.");
        open_init_setup_window(app)?;
        return Ok(());
    }
    finalize_settings(app, &mut settings, &settings_path, &catalog_config_dir)?;
    open_main_window(app).map_err(|e| Error::new(ErrorKind::Other, e))?;
    Ok(())
}

// パスを取得する関数（使い方：paths::dirs().catalog_config_dirなど）
pub fn dirs() -> Arc<AppDirs> {
    APP_DIR.get().expect("init_settings() must be called first").load_full()
}

// JS用の呼び出し関数
use std::collections::HashMap;
#[tauri::command]
pub fn get_app_dirs() -> HashMap<String, String> {
    let dirs = Arc::try_unwrap(dirs()).unwrap_or_else(|arc| (*arc).clone());
    HashMap::from([
        ("aviutl2_root", dirs.aviutl2_root.display().to_string()),
        ("aviutl2_data", dirs.aviutl2_data.display().to_string()),
        ("plugin_dir", dirs.plugin_dir.display().to_string()),
        ("script_dir", dirs.script_dir.display().to_string()),
        ("catalog_exe_dir", dirs.catalog_exe_dir.display().to_string()),
        ("catalog_config_dir", dirs.catalog_config_dir.display().to_string()),
        ("log_path", dirs.log_path.display().to_string()),
    ])
    .into_iter()
    .map(|(k, v)| (k.to_string(), v))
    .collect()
}

// APP_DIR を初期化または更新
fn set_appdirs(appdirs: AppDirs) -> std::io::Result<()> {
    let arc = Arc::new(appdirs);
    if let Some(cell) = APP_DIR.get() {
        cell.store(arc);
        Ok(())
    } else {
        APP_DIR.set(ArcSwap::from(arc)).map_err(|_| Error::new(ErrorKind::AlreadyExists, "APP_DIR already initialized"))
    }
}

// APP_DIRの作成、UpdateCheckerの移動、settings.jsonの更新
fn finalize_settings(app: &AppHandle, settings: &mut Settings, settings_path: &Path, catalog_config_dir: &Path) -> std::io::Result<()> {
    if settings.aviutl2_root.as_os_str().is_empty() {
        crate::log_error(app, "aviutl2_root is empty in finalize_settings");
        std::process::exit(1);
    }
    // AviUtl2 の data ディレクトリを取得
    let aviutl2_data = if settings.is_portable_mode {
        PathBuf::from(&settings.aviutl2_root).join("data")
    } else {
        std::env::var_os("PROGRAMDATA").map(PathBuf::from).unwrap_or_else(|| PathBuf::from(r"C:\\ProgramData")).join("aviutl2")
    };
    // 本ソフトの実行ファイルのあるディレクトリを取得
    let catalog_exe_path: PathBuf = std::env::current_exe()?;
    let catalog_exe_dir = catalog_exe_path.parent().map(PathBuf::from).unwrap_or_default();
    // AppDirs を作成して保存
    let appdirs = AppDirs {
        aviutl2_root: settings.aviutl2_root.clone(),
        aviutl2_data: aviutl2_data.clone(),
        plugin_dir: aviutl2_data.join("Plugin"),
        script_dir: aviutl2_data.join("Script"),
        catalog_exe_dir: catalog_exe_dir.clone(),
        catalog_config_dir: catalog_config_dir.to_path_buf(),
        log_path: catalog_config_dir.join("logs").join("app.log"),
    };
    crate::log_info(app, &format!("AppDirs: {:?}", appdirs)); // 確認用ログ
    set_appdirs(appdirs)?; // APP_DIR を作成・更新
    let current_ver = app.package_info().version.to_string();
    // UpdateCheckerプラグインを移動 (バージョンが異なるなら強制)
    crate::install_update_checker_plugin(app, &aviutl2_data.join("Plugin"), settings.app_version != current_ver);
    // 設定を更新して保存
    settings.app_version = current_ver;
    settings.catalog_exe_path = catalog_exe_path;
    settings.save_to_file(settings_path)?;

    Ok(())
}

// "init-setup" ウィンドウを開く
fn open_init_setup_window(app: &AppHandle) -> std::io::Result<()> {
    if app.get_webview_window("init-setup").is_none() {
        let mut builder = WebviewWindowBuilder::new(app, "init-setup", WebviewUrl::App("/".into()))
            .title("セットアップ")
            .inner_size(850.0, 640.0)
            .resizable(true)
            .decorations(false)
            .visible(false);

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

        builder.build().map_err(|e| Error::new(ErrorKind::Other, e.to_string()))?;
    } else if let Some(window) = app.get_webview_window("init-setup") {
        let _ = window.show();
        let _ = window.set_focus();
    }

    Ok(())
}

// "main" ウィンドウを開く
fn open_main_window(app: &AppHandle) -> Result<(), String> {
    if let Some(window) = app.get_webview_window("main") {
        window.show().map_err(|e| e.to_string())?;
        let _ = window.maximize();
        let _ = window.set_focus();
        return Ok(());
    }

    let mut builder = WebviewWindowBuilder::new(app, "main", WebviewUrl::App("/".into()))
        .title("AviUtl2 カタログ")
        .inner_size(950.0, 760.0)
        .resizable(true)
        .decorations(false)
        .visible(false);

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

    let window = builder.build().map_err(|e| e.to_string())?;
    let _ = window.maximize();
    let _ = window.set_focus();
    Ok(())
}

// 初期設定完了後にメインウィンドウを開き、初期設定ウィンドウを閉じる
#[tauri::command]
pub async fn complete_initial_setup(app: AppHandle) -> Result<(), String> {
    open_main_window(&app)?;
    if let Some(setup) = app.get_webview_window("init-setup") {
        let _ = setup.close();
    }
    Ok(())
}

// aviutl2_rootを保存し、APP_DIRを更新
#[tauri::command]
pub async fn update_settings(app: AppHandle, aviutl2_root: String, is_portable_mode: bool, theme: String, package_state_opt_out: bool) -> Result<(), String> {
    let trimmed = aviutl2_root.trim();
    if trimmed.is_empty() {
        return Err(String::from("AviUtl2 のフォルダを選択してください。"));
    }
    let root_path = resolve_aviutl_root(trimmed);
    if root_path.as_os_str().is_empty() {
        return Err(String::from("AviUtl2 のフォルダを選択してください。"));
    }
    let catalog_config_dir = app.path().app_config_dir().map_err(|e| e.to_string())?;
    fs::create_dir_all(&catalog_config_dir).map_err(|e| e.to_string())?;
    let settings_path = catalog_config_dir.join("settings.json");
    let mut settings = Settings::load_from_file(&settings_path);
    settings.aviutl2_root = root_path;
    settings.is_portable_mode = is_portable_mode;
    settings.theme = theme.to_string();
    settings.package_state_opt_out = package_state_opt_out;
    finalize_settings(&app, &mut settings, &settings_path, &catalog_config_dir).map_err(|e| e.to_string())
}

// aviutl2_rootの初期値を返す
#[tauri::command]
pub fn default_aviutl2_root() -> Result<String, String> {
    let mut root = std::env::var_os("PROGRAMFILES").map(PathBuf::from).unwrap_or_else(|| PathBuf::from(r"C:\Program Files"));
    root.push("AviUtl2");
    Ok(pathbuf_to_string(&root))
}

// aviutl2_rootのパスを正規化して返す
fn resolve_aviutl_root(raw: &str) -> PathBuf {
    let trimmed = raw.trim();
    if trimmed.is_empty() {
        return PathBuf::new();
    }
    let normalized = trimmed.replace('/', "\\");
    PathBuf::from(normalized)
}

// aviutl2_rootのパスを正規化して返す(JS用)
#[tauri::command]
pub fn resolve_aviutl2_root(raw: String) -> Result<String, String> {
    let resolved = resolve_aviutl_root(&raw);
    if resolved.as_os_str().is_empty() {
        Err(String::from("AviUtl2 のフォルダを選択してください。"))
    } else {
        Ok(pathbuf_to_string(&resolved))
    }
}
