use arc_swap::ArcSwap;
use once_cell::sync::Lazy;
use once_cell::sync::OnceCell;
use serde::{Deserialize, Serialize};
use serde_json::Value;
use std::sync::{Arc, Mutex};
use std::{
    fs,
    io::{Error, ErrorKind},
    path::{Path, PathBuf},
};
use tauri::{AppHandle, Manager, WebviewUrl, WebviewWindowBuilder};

static APP_DIR: OnceCell<ArcSwap<AppDirs>> = OnceCell::new();
static SETTINGS_FILE_LOCK: Lazy<Mutex<()>> = Lazy::new(|| Mutex::new(()));
pub const AUO_SETUP_READY_KEYWORD: &str = "を使用する準備が完了しました。";

fn pathbuf_to_string(path: &Path) -> String {
    path.to_string_lossy().into_owned()
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum UiLocale {
    Ja,
    En,
    Ko,
    ZhCn,
    ZhTw,
}

impl UiLocale {
    pub fn parse(locale: &str) -> Self {
        let normalized = locale.trim().to_ascii_lowercase();
        if normalized == "zh" || normalized.starts_with("zh-cn") || normalized.starts_with("zh-hans") || normalized.starts_with("zh-sg") {
            Self::ZhCn
        } else if normalized.starts_with("zh-tw") || normalized.starts_with("zh-hk") || normalized.starts_with("zh-mo") || normalized.starts_with("zh-hant") {
            Self::ZhTw
        } else if normalized.starts_with("ko") {
            Self::Ko
        } else if normalized.starts_with("en") {
            Self::En
        } else {
            Self::Ja
        }
    }

    pub fn as_str(self) -> &'static str {
        match self {
            Self::Ja => "ja",
            Self::En => "en",
            Self::Ko => "ko",
            Self::ZhCn => "zh-CN",
            Self::ZhTw => "zh-TW",
        }
    }
}

static COMMON_RESOURCES_JA: Lazy<Value> = Lazy::new(|| serde_json::from_str(include_str!("../../src/i18n/resources/ja/common.json")).expect("failed to parse ja common.json"));
static COMMON_RESOURCES_EN: Lazy<Value> = Lazy::new(|| serde_json::from_str(include_str!("../../src/i18n/resources/en/common.json")).expect("failed to parse en common.json"));
static COMMON_RESOURCES_KO: Lazy<Value> = Lazy::new(|| serde_json::from_str(include_str!("../../src/i18n/resources/ko/common.json")).expect("failed to parse ko common.json"));
static COMMON_RESOURCES_ZH_CN: Lazy<Value> =
    Lazy::new(|| serde_json::from_str(include_str!("../../src/i18n/resources/zh-CN/common.json")).expect("failed to parse zh-CN common.json"));
static COMMON_RESOURCES_ZH_TW: Lazy<Value> =
    Lazy::new(|| serde_json::from_str(include_str!("../../src/i18n/resources/zh-TW/common.json")).expect("failed to parse zh-TW common.json"));

fn common_resources(locale: UiLocale) -> &'static Value {
    match locale {
        UiLocale::Ja => &COMMON_RESOURCES_JA,
        UiLocale::En => &COMMON_RESOURCES_EN,
        UiLocale::Ko => &COMMON_RESOURCES_KO,
        UiLocale::ZhCn => &COMMON_RESOURCES_ZH_CN,
        UiLocale::ZhTw => &COMMON_RESOURCES_ZH_TW,
    }
}

fn lookup_common_message(locale: UiLocale, key: &str) -> Option<&'static str> {
    let mut current = common_resources(locale);
    for segment in key.split('.') {
        current = current.get(segment)?;
    }
    current.as_str()
}

fn interpolate_message(template: &str, args: &[(&str, &str)]) -> String {
    let mut output = template.to_string();
    for (key, value) in args {
        output = output.replace(&format!("{{{{{key}}}}}"), value);
    }
    output
}

pub fn current_ui_locale() -> UiLocale {
    let Some(app_dirs) = APP_DIR.get().map(|cell| cell.load_full()) else {
        return UiLocale::Ja;
    };
    let settings_path = app_dirs.catalog_config_dir.join("settings.json");
    UiLocale::parse(&Settings::load_from_file(&settings_path).locale)
}

pub fn common_message(locale: UiLocale, key: &str) -> String {
    common_message_with_args(locale, key, &[])
}

pub fn common_message_with_args(locale: UiLocale, key: &str, args: &[(&str, &str)]) -> String {
    let template = lookup_common_message(locale, key).or_else(|| lookup_common_message(UiLocale::En, key)).unwrap_or(key);
    interpolate_message(template, args)
}

pub fn common_message_current(key: &str) -> String {
    common_message(current_ui_locale(), key)
}

// settings.jsonから読み込む項目
#[derive(Debug, Clone, Serialize, Deserialize, Default)]
#[serde(default)]
pub struct Settings {
    pub aviutl2_root: PathBuf,                   // AviUtl2 のルートディレクトリ
    pub is_portable_mode: bool,                  // ポータブルモードかどうか
    pub theme: String,                           // テーマ
    pub locale: String,                          // UI ロケール
    pub package_state_opt_out: bool,             // 匿名統計の送信を無効化
    pub package_updates_paused_ids: Vec<String>, // 一時停止中のパッケージID一覧(UpdateCheckerの更新で使用予定)
    pub local_mode_enabled: bool,                // ローカル配信カタログを読み込むメンテナー向けモード
    pub local_manifest_path: PathBuf,            // メンテナー向けモードで読み込むローカルの manifest.json
    pub app_version: String,                     // 本アプリのバージョン(UpdateCheckerの更新で使用)
    pub catalog_exe_path: PathBuf,               // 本ソフトの実行ファイルのパス(UpdateCheckerで使用))
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
        tracing::error!("Failed to get catalog_config_dir: {err}");
        std::process::exit(1);
    });
    let _ = create_dir_all(&catalog_config_dir);
    let settings_path = catalog_config_dir.join("settings.json");

    let mut settings: Settings = Settings::load_from_file(&settings_path);
    tracing::info!("Loaded settings: {:?}", settings);

    if settings.aviutl2_root.as_os_str().is_empty() {
        tracing::info!("settings.json not found - opening setup window.");
        open_init_setup_window(app)?;
        return Ok(());
    }
    finalize_settings(app, &mut settings, &settings_path, &catalog_config_dir)?;
    open_main_window(app).map_err(Error::other)?;
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
        tracing::error!("aviutl2_root is empty in finalize_settings");
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
    tracing::info!("AppDirs: {:?}", appdirs); // 確認用ログ
    set_appdirs(appdirs)?; // APP_DIR を作成・更新
    let current_ver = app.package_info().version.to_string();
    // UpdateCheckerプラグインを移動 (バージョンが異なるなら強制)
    install_update_checker_plugin(app, &aviutl2_data.join("Plugin"), settings.app_version != current_ver, &catalog_exe_dir);
    // 設定を更新して保存
    settings.app_version = current_ver;
    settings.catalog_exe_path = catalog_exe_path;
    settings.save_to_file(settings_path)?;

    Ok(())
}

// "init-setup" ウィンドウを開く
fn open_init_setup_window(app: &AppHandle) -> std::io::Result<()> {
    if app.get_webview_window("init-setup").is_none() {
        let mut builder = WebviewWindowBuilder::new(app, "init-setup", WebviewUrl::App("/?window=init-setup".into()))
            .title(common_message_current("backend.windowTitles.setup"))
            .inner_size(850.0, 640.0)
            .center()
            .resizable(true)
            .decorations(false)
            .transparent(true)
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

        let window = builder.build().map_err(|e| Error::other(e.to_string()))?;
        let _ = window.hide();
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
        let _ = window.set_focus();
        return Ok(());
    }

    let mut builder = WebviewWindowBuilder::new(app, "main", WebviewUrl::App("/".into()))
        .title(common_message_current("backend.windowTitles.main"))
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
    let _ = window.hide();
    Ok(())
}

fn install_update_checker_plugin(_app: &AppHandle, plugin_dir: &Path, force_copy: bool, catalog_exe_dir: &Path) {
    let dst = plugin_dir.join("UpdateChecker.aui2");
    if !force_copy && dst.exists() {
        return;
    }
    let src = catalog_exe_dir.join("resources").join("updateChecker.aui2");
    if src.exists() {
        if let Some(parent) = dst.parent() {
            let _ = fs::create_dir_all(parent);
        }
        match fs::copy(&src, &dst) {
            Ok(_) => tracing::info!("Placed UpdateChecker.aui2 to {}", dst.display()),
            Err(e) => tracing::error!("Failed to copy {} to {}: {}", src.display(), dst.display(), e),
        }
    } else {
        tracing::error!("Source file not found: {}", src.display());
    }
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
pub async fn update_settings(
    app: AppHandle,
    aviutl2_root: String,
    is_portable_mode: bool,
    theme: String,
    locale: String,
    package_state_opt_out: bool,
    local_mode_enabled: bool,
    local_manifest_path: String,
) -> Result<(), String> {
    let locale = UiLocale::parse(&locale);
    let missing_root_message = common_message(locale, "backend.errors.aviutlFolderRequired");
    let trimmed = aviutl2_root.trim();
    if trimmed.is_empty() {
        return Err(missing_root_message.clone());
    }
    let root_path = resolve_aviutl_root(trimmed);
    if root_path.as_os_str().is_empty() {
        return Err(missing_root_message);
    }
    let catalog_config_dir = app.path().app_config_dir().map_err(|e| e.to_string())?;
    fs::create_dir_all(&catalog_config_dir).map_err(|e| e.to_string())?;
    let settings_path = catalog_config_dir.join("settings.json");
    let _settings_guard = SETTINGS_FILE_LOCK.lock().unwrap_or_else(|poisoned| poisoned.into_inner());
    let mut settings = Settings::load_from_file(&settings_path);
    settings.aviutl2_root = root_path;
    settings.is_portable_mode = is_portable_mode;
    settings.theme = theme.to_string();
    settings.locale = locale.as_str().to_string();
    settings.package_state_opt_out = package_state_opt_out;
    settings.local_mode_enabled = local_mode_enabled;
    settings.local_manifest_path = PathBuf::from(local_manifest_path.trim());
    finalize_settings(&app, &mut settings, &settings_path, &catalog_config_dir).map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn set_package_update_paused(app: AppHandle, package_id: String, paused: bool) -> Result<Vec<String>, String> {
    let package_id = package_id.trim();
    if package_id.is_empty() {
        return Err(common_message_current("backend.errors.packageIdEmpty"));
    }

    let catalog_config_dir = app.path().app_config_dir().map_err(|e| e.to_string())?;
    fs::create_dir_all(&catalog_config_dir).map_err(|e| e.to_string())?;
    let settings_path = catalog_config_dir.join("settings.json");
    let _settings_guard = SETTINGS_FILE_LOCK.lock().unwrap_or_else(|poisoned| poisoned.into_inner());
    let mut settings = Settings::load_from_file(&settings_path);
    settings.package_updates_paused_ids.retain(|id| !id.trim().is_empty());

    if paused {
        if !settings.package_updates_paused_ids.iter().any(|id| id == package_id) {
            settings.package_updates_paused_ids.push(package_id.to_string());
        }
    } else {
        settings.package_updates_paused_ids.retain(|id| id != package_id);
    }

    settings.package_updates_paused_ids.sort_unstable();
    settings.package_updates_paused_ids.dedup();
    settings.save_to_file(&settings_path).map_err(|e| e.to_string())?;
    Ok(settings.package_updates_paused_ids)
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
        Err(common_message_current("backend.errors.aviutlFolderRequired"))
    } else {
        Ok(pathbuf_to_string(&resolved))
    }
}
