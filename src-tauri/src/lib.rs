#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .invoke_handler(tauri::generate_handler![
            open_file,
            open_folder,
            file_exists,
            get_file_metadata,
            read_topographie_bundle
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}

#[tauri::command]
fn open_file(path: String) -> Result<String, String> {
    use std::process::Command;
    
    #[cfg(target_os = "windows")]
    {
        Command::new("cmd")
            .args(&["/C", "start", "", &path])
            .spawn()
            .map_err(|e| e.to_string())?;
        Ok("Fichier ouvert avec succès".to_string())
    }
    
    #[cfg(not(target_os = "windows"))]
    {
        Command::new("xdg-open")
            .arg(&path)
            .spawn()
            .map_err(|e| e.to_string())?;
        Ok("Fichier ouvert avec succès".to_string())
    }
}

#[tauri::command]
fn open_folder(path: String) -> Result<String, String> {
    use std::process::Command;
    
    #[cfg(target_os = "windows")]
    {
        Command::new("explorer")
            .arg(&path)
            .spawn()
            .map_err(|e| e.to_string())?;
        Ok("Dossier ouvert avec succès".to_string())
    }
    
    #[cfg(not(target_os = "windows"))]
    {
        Command::new("xdg-open")
            .arg(&path)
            .spawn()
            .map_err(|e| e.to_string())?;
        Ok("Dossier ouvert avec succès".to_string())
    }
}

#[tauri::command]
fn file_exists(path: String) -> Result<bool, String> {
    Ok(std::path::Path::new(&path).exists())
}

#[tauri::command]
fn get_file_metadata(path: String) -> Result<serde_json::Value, String> {
    use std::fs;
    
    let metadata = fs::metadata(&path).map_err(|e| e.to_string())?;
    let file_name = std::path::Path::new(&path)
        .file_name()
        .and_then(|n| n.to_str())
        .unwrap_or("")
        .to_string();
    
    let extension = std::path::Path::new(&path)
        .extension()
        .and_then(|e| e.to_str())
        .unwrap_or("")
        .to_string()
        .to_uppercase();
    
    Ok(serde_json::json!({
        "name": file_name,
        "extension": extension,
        "size": metadata.len(),
        "lastModified": metadata.modified()
            .map(|m| m.duration_since(std::time::UNIX_EPOCH)
                .map(|d| d.as_millis())
                .unwrap_or(0))
            .unwrap_or(0),
        "path": path
    }))
}

#[tauri::command]
fn read_topographie_bundle(shp_path: String) -> Result<serde_json::Value, String> {
    use std::fs;
    use std::path::{Path, PathBuf};

    fn b64(bytes: &[u8]) -> String {
        const TABLE: &[u8; 64] = b"ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
        let mut out = String::with_capacity((bytes.len() + 2) / 3 * 4);
        let mut i = 0;
        while i < bytes.len() {
            let a = bytes[i] as u32;
            let b = if i + 1 < bytes.len() { bytes[i + 1] as u32 } else { 0 };
            let c = if i + 2 < bytes.len() { bytes[i + 2] as u32 } else { 0 };
            out.push(TABLE[(a >> 2) as usize] as char);
            out.push(TABLE[(((a & 3) << 4) | (b >> 4)) as usize] as char);
            out.push(if i + 1 < bytes.len() { TABLE[(((b & 15) << 2) | (c >> 6)) as usize] as char } else { '=' });
            out.push(if i + 2 < bytes.len() { TABLE[(c & 63) as usize] as char } else { '=' });
            i += 3;
        }
        out
    }

    let shp = PathBuf::from(&shp_path);
    if shp.extension().and_then(|e| e.to_str()).unwrap_or("").to_lowercase() != "shp" {
        return Err("Le fichier source doit être un .shp".to_string());
    }
    let stem = shp.file_stem().and_then(|s| s.to_str()).ok_or_else(|| "Nom SHP invalide".to_string())?;
    let dir = shp.parent().unwrap_or_else(|| Path::new("."));
    let shx_path = dir.join(format!("{stem}.shx"));
    let dbf_path = dir.join(format!("{stem}.dbf"));
    let prj_path = dir.join(format!("{stem}.prj"));
    let shp_bytes = fs::read(&shp).map_err(|e| format!("Lecture SHP impossible: {e}"))?;
    let shx_bytes = fs::read(&shx_path).map_err(|e| format!("Lecture SHX impossible: {e}"))?;
    let dbf_bytes = fs::read(&dbf_path).map_err(|e| format!("Lecture DBF impossible: {e}"))?;
    let prj = fs::read_to_string(&prj_path).unwrap_or_default();
    Ok(serde_json::json!({
        "shp": b64(&shp_bytes),
        "shx": b64(&shx_bytes),
        "dbf": b64(&dbf_bytes),
        "prj": prj,
        "sourcePath": shp_path
    }))
}
