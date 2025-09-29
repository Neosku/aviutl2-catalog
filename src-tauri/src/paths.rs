use arc_swap::ArcSwap;
use once_cell::sync::OnceCell;
use serde::{Deserialize, Serialize};
use std::sync::Arc;
use std::{
    fs,
    path::{Path, PathBuf},
};

static APP_DIR: OnceCell<ArcSwap<AppDirs>> = OnceCell::new();

// settings.jsonから読み込み項目
#[derive(Debug, Clone, Serialize, Deserialize, Default)] // ← Default も derive
#[serde(default)]
pub struct Settings {
    pub aviutl2_root: PathBuf,     // AviUtl2 のルートディレクトリ
    pub is_portable_mode: bool,    // ポータブルモードかどうか
    pub thema: String,             // テーマ
    pub app_version: String,       // 本アプリのバージョン(UpdateCheckerの更新で使用)
    pub catalog_exe_path: PathBuf, // 本ソフトの実行ファイルのパス(UpdateCheckerで使用))
}

// アプリケーションで使用するディレクトリ一覧
#[derive(Debug)]
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
        match fs::read_to_string(path) {
            Ok(s) => match serde_json::from_str(&s) {
                Ok(me) => me,
                Err(e) => {
                    eprintln!("設定ファイルのパースに失敗しました: {e}");
                    Self::default()
                }
            },
            Err(e) => {
                eprintln!("設定ファイルの読み込みに失敗しました: {e}");
                Self::default()
            }
        }
    }

    /// JSONに保存
    pub fn save_to_file(&self, path: impl AsRef<Path>) -> std::io::Result<()> {
        let json = serde_json::to_string_pretty(self).map_err(|e| std::io::Error::new(std::io::ErrorKind::InvalidData, e))?;
        fs::create_dir_all(path.as_ref().parent().unwrap_or(Path::new(".")))?;
        fs::write(path, json)
    }
}

use tauri::AppHandle;
use tauri::Manager;

// 起動時初期化
// 流れ：setting.jsonからファイルを読み込み→app_dirがない場合は初期設定→パスを登録→現在のバージョンを取得し比較→updateCheckerの移動の可否を決定
pub fn init_settings(app: &AppHandle) -> std::io::Result<()> {
    use std::fs::create_dir_all;
    use std::path::PathBuf;
    use std::sync::Arc;

    // settings.jsonのパスを決定
    let catalog_config_dir: PathBuf = app.path().app_config_dir().unwrap_or_else(|err| {
        crate::log_error(app, &format!("Failed to get configuration directory: {err}"));
        std::process::exit(1);
    });
    let _ = create_dir_all(&catalog_config_dir);
    let settings_path = catalog_config_dir.join("settings.json");

    // 読み込み(なくてもdefaultで初期化)
    let mut settings: Settings = Settings::load_from_file(&settings_path);

    crate::log_info(&app, &format!("{:?}", settings)); // ログ(検証用)

    // settings.jsonがない場合は初期設定画面を開く(aviutl2_rootがない場合)
    if settings.aviutl2_root.as_os_str().is_empty() {
        // 初期設定画面のウィンドウの実装（aviutlのディレクトリの選択→初心者のダウンロードを行うかどうか）
        // return Err(std::io::Error::new(std::io::ErrorKind::InvalidInput, "aviutl2_root is empty"));
        // ここでinit_app_firstを呼ぶのもあり
        crate::log_info(&app, "settings.jsonの読み込みに失敗しました。設定画面を開きます。");
        settings.aviutl2_root = "c:\\Program Files\\AviUtl2".into(); // 仮の初期値
    }

    // aviutl_dataのパスを決定
    let aviutl2_data: PathBuf = if settings.is_portable_mode {
        PathBuf::from(&settings.aviutl2_root).join("data")
    } else {
        std::env::var_os("PROGRAMDATA").map(PathBuf::from).unwrap_or_else(|| PathBuf::from(r"C:\ProgramData")).join("aviutl2")
    };

    // 本アプリの実行ファイルのパスを取得
    let catalog_exe_path: PathBuf = std::env::current_exe()?;
    let catalog_exe_dir = catalog_exe_path.parent().map(PathBuf::from).unwrap_or_default();

    // AppDirsを構築
    let appdirs = AppDirs {
        // aviutl2関係
        aviutl2_root: settings.aviutl2_root.clone(),
        aviutl2_data: aviutl2_data.clone(),
        plugin_dir: aviutl2_data.join("Plugin"),
        script_dir: aviutl2_data.join("Script"),
        // 本ソフト関係
        catalog_exe_dir: catalog_exe_dir.clone(),
        catalog_config_dir: catalog_config_dir.clone(),
        log_path: catalog_config_dir.join("logs").join("app.log"),
    };

    crate::log_info(&app, &format!("{:?}", appdirs)); // ログ(検証用)

    // ArcSwap にセット
    let arc = Arc::new(appdirs);
    APP_DIR.set(ArcSwap::from(arc)).map_err(|_| std::io::Error::new(std::io::ErrorKind::AlreadyExists, "SETTINGS already initialized"))?;

    // UpdateChecker.exe の移動の必要性を決定
    // 現在のバージョンを取得
    let current_ver = app.package_info().version.to_string();
    crate::log_info(&app, &format!("current_ver = {}", current_ver)); // ログ(検証用)

    // UpdateChecker.exe の移動を行う
    crate::install_update_checker_plugin(app, &aviutl2_data.join("plugin"), settings.app_version != current_ver);

    // settings.json に現在のバージョンと実行ファイルのパスを書き込む
    settings.app_version = current_ver;
    settings.catalog_exe_path = catalog_exe_path;
    settings.save_to_file(&settings_path)?;

    Ok(())
}

// パスを取得する関数（使い方：paths::dirs().catalog_config_dirなど）
pub fn dirs() -> Arc<AppDirs> {
    APP_DIR.get().expect("init_settings() must be called first").load_full()
}

// // 設定を差し替え（UIで変更されたときに呼ぶ）。同時に JSON へ保存したい場合は path を渡す。
// // よく検討必要
// pub fn update_settings(new_settings: Settings, save_to: Option<&Path>) -> std::io::Result<()> {
//     let s = new_settings;
//     if let Some(p) = save_to {
//         s.save_to_file(p)?;
//     }
//     // 必要に応じて AppDirs 再構築＆ store(...) を実装
//     Ok(())
// }
