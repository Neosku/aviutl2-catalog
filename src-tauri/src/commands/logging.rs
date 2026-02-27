#[derive(Debug, Clone, PartialEq, Eq, serde::Serialize, serde::Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum LogLevel {
    Trace,
    Debug,
    Info,
    Warn,
    Error,
}

#[tauri::command]
pub fn log_cmd(level: LogLevel, msg: String) {
    match level {
        LogLevel::Trace => tracing::trace!("{}", msg),
        LogLevel::Debug => tracing::debug!("{}", msg),
        LogLevel::Info => tracing::info!("{}", msg),
        LogLevel::Warn => tracing::warn!("{}", msg),
        LogLevel::Error => tracing::error!("{}", msg),
    }
}
