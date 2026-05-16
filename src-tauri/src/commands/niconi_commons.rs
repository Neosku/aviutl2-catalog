use serde::{Deserialize, Serialize};
use std::fs;

#[derive(Debug, Deserialize, Serialize)]
pub struct NiconiCommonsExportInput {
    #[serde(rename = "schemaVersion")]
    schema_version: u8,
    #[serde(rename = "generatedAt")]
    generated_at: String,
    ids: Vec<String>,
    packages: Vec<NiconiCommonsExportPackageInput>,
}

#[derive(Debug, Deserialize, Serialize)]
pub struct NiconiCommonsExportPackageInput {
    #[serde(rename = "packageId")]
    package_id: String,
    name: String,
    #[serde(rename = "niconiCommonsId")]
    niconi_commons_id: String,
}

#[tauri::command]
pub fn write_niconi_commons_ids(payload: NiconiCommonsExportInput) -> Result<(), String> {
    let dirs = crate::paths::dirs();
    fs::create_dir_all(&dirs.aviutl2_data).map_err(|e| e.to_string())?;
    let path = dirs.aviutl2_data.join("catalog-niconi-commons-id.json");
    let json = serde_json::to_string_pretty(&payload).map_err(|e| e.to_string())?;
    fs::write(path, format!("{json}\n")).map_err(|e| e.to_string())
}
