#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .invoke_handler(tauri::generate_handler![
            open_file,
            open_folder,
            file_exists,
            get_file_metadata
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