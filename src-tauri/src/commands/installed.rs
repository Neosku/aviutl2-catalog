#[tauri::command]
pub fn get_installed_map_cmd(app: tauri::AppHandle) -> Result<std::collections::HashMap<String, String>, String> {
    Ok(crate::read_installed_map(&app))
}

#[tauri::command]
pub fn add_installed_id_cmd(app: tauri::AppHandle, id: String, version: Option<String>) -> Result<std::collections::HashMap<String, String>, String> {
    let mut map = crate::read_installed_map(&app);
    map.insert(id, version.unwrap_or_default());
    crate::write_installed_map(&app, &map)?;
    Ok(map)
}

#[tauri::command]
pub fn remove_installed_id_cmd(app: tauri::AppHandle, id: String) -> Result<std::collections::HashMap<String, String>, String> {
    let mut map = crate::read_installed_map(&app);
    map.remove(&id);
    crate::write_installed_map(&app, &map)?;
    Ok(map)
}
