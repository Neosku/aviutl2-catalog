use once_cell::sync::Lazy;
use serde::Deserialize;
use std::sync::RwLock;

#[derive(Clone)]
struct IndexItem {
    id: String,
    name_key: String,
    author_key: String,
    summary_key: String,
    item_type: String,
    tags: Vec<String>,
    updated_at: Option<i64>,
}

static CATALOG: Lazy<RwLock<Vec<IndexItem>>> = Lazy::new(|| RwLock::new(Vec::new()));

#[derive(Debug, Clone, Deserialize)]
pub struct CatalogVersionInput {
    #[serde(default)]
    release_date: String,
}

#[derive(Debug, Clone, Deserialize)]
pub struct CatalogIndexInput {
    #[serde(default)]
    id: String,
    #[serde(default)]
    name: String,
    #[serde(default)]
    author: String,
    #[serde(default)]
    summary: String,
    #[serde(rename = "type", default)]
    item_type: String,
    #[serde(default)]
    tags: Vec<String>,
    #[serde(default, alias = "version")]
    versions: Vec<CatalogVersionInput>,
}

fn normalize(s: &str) -> String {
    let mut out = String::with_capacity(s.len());
    for ch in s.trim().to_lowercase().chars() {
        let code = ch as u32;
        if (0xFF01..=0xFF5E).contains(&code) {
            let mapped = std::char::from_u32(code - 0xFEE0).unwrap_or(ch);
            out.push(mapped);
            continue;
        }
        if code == 0x3000 {
            out.push(' ');
            continue;
        }
        if (0x30A1..=0x30F6).contains(&code) {
            let mapped = std::char::from_u32(code - 0x60).unwrap_or(ch);
            out.push(mapped);
            continue;
        }
        out.push(ch);
    }
    out
}

fn parse_updated_at(versions: &[CatalogVersionInput]) -> Option<i64> {
    if versions.is_empty() {
        return None;
    }
    let last = versions.last()?;
    let s = &last.release_date;
    let s = s.replace('/', "-");
    let parts: Vec<&str> = s.split('-').collect();
    if parts.len() < 3 {
        return None;
    }
    let y = parts[0].parse::<i32>().ok()?;
    let m = parts[1].parse::<u8>().ok()?;
    let d = parts[2].parse::<u8>().ok()?;
    use time::{Date, Month, PrimitiveDateTime, Time};
    let month = Month::try_from(m).ok()?;
    let date = Date::from_calendar_date(y, month, d).ok()?;
    let dt = PrimitiveDateTime::new(date, Time::MIDNIGHT);
    Some(dt.assume_utc().unix_timestamp() * 1000)
}

#[tauri::command]
pub fn set_catalog_index(items: Vec<CatalogIndexInput>) -> Result<usize, String> {
    let mut v: Vec<IndexItem> = Vec::with_capacity(items.len());
    for it in items {
        let id = it.id;
        if id.is_empty() {
            continue;
        }
        let name = it.name;
        let item_type = it.item_type;
        let tags = it.tags;
        let author = it.author;
        let summary = it.summary;
        let updated_at = parse_updated_at(&it.versions);
        let item = IndexItem {
            id,
            name_key: normalize(&name),
            author_key: normalize(&author),
            summary_key: normalize(&summary),
            item_type,
            tags,
            updated_at,
        };
        v.push(item);
    }
    let mut guard = CATALOG.write().map_err(|_| String::from("catalog lock poisoned"))?;
    *guard = v;
    Ok(guard.len())
}

#[tauri::command]
pub fn query_catalog_index(q: Option<String>, tags: Option<Vec<String>>, types: Option<Vec<String>>, sort: Option<String>, dir: Option<String>) -> Vec<String> {
    let guard = match CATALOG.read() {
        Ok(g) => g,
        Err(_) => return Vec::new(),
    };
    let qnorm = q.unwrap_or_default();
    let terms: Vec<String> = normalize(&qnorm).split_whitespace().filter(|s| !s.is_empty()).map(|s| s.to_string()).collect();
    let tag_filter = tags.unwrap_or_default();
    let type_filter = types.unwrap_or_default();
    let mut filtered: Vec<&IndexItem> = guard
        .iter()
        .filter(|it| {
            let qok = if terms.is_empty() { true } else { terms.iter().all(|t| it.name_key.contains(t) || it.author_key.contains(t) || it.summary_key.contains(t)) };
            if !qok {
                return false;
            }
            let tag_ok = if tag_filter.is_empty() { true } else { it.tags.iter().any(|t| tag_filter.iter().any(|x| x == t)) };
            if !tag_ok {
                return false;
            }
            if type_filter.is_empty() { true } else { type_filter.iter().any(|x| x == &it.item_type) }
        })
        .collect();

    let sort_key = sort.unwrap_or_else(|| "newest".to_string());
    let dir_key = dir.unwrap_or_else(|| if sort_key == "name" { "asc".to_string() } else { "desc".to_string() });
    match sort_key.as_str() {
        "name" => {
            filtered.sort_by(|a, b| a.name_key.cmp(&b.name_key));
            if dir_key == "desc" {
                filtered.reverse();
            }
        }
        _ => {
            filtered.sort_by(|a, b| match (a.updated_at, b.updated_at) {
                (Some(au), Some(bu)) => au.cmp(&bu),
                (Some(_), None) => std::cmp::Ordering::Greater,
                (None, Some(_)) => std::cmp::Ordering::Less,
                (None, None) => a.name_key.cmp(&b.name_key),
            });
            if dir_key == "desc" {
                filtered.reverse();
            }
        }
    }
    filtered.iter().map(|it| it.id.clone()).collect()
}
