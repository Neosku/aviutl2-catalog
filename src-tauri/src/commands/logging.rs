#[tauri::command]
pub fn log_cmd(app: tauri::AppHandle, level: String, msg: String) {
    crate::log_line(&app, &level, &msg);
}
