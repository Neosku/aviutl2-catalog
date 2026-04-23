use std::io::{Cursor, Read};

#[tauri::command]
pub fn decompress_zstd_to_utf8(bytes: Vec<u8>) -> Result<String, String> {
    let cursor = Cursor::new(bytes);
    let mut decoder = zstd::stream::read::Decoder::new(cursor).map_err(|error| format!("failed to create zstd decoder: {error}"))?;

    let mut text = String::new();
    decoder.read_to_string(&mut text).map_err(|error| format!("failed to decode zstd payload as utf-8 text: {error}"))?;

    Ok(text)
}
