use std::sync::Mutex;
use tauri::{Emitter, Manager};

/// Extract the first valid .json file path from CLI args.
fn extract_json_path(args: &[String]) -> Option<String> {
    // First arg is the executable path, subsequent args are file paths from OS file association
    for arg in args.iter().skip(1) {
        let path = std::path::Path::new(arg);
        if path.extension().is_some_and(|ext| ext == "json") && path.exists() {
            return Some(arg.clone());
        }
    }
    None
}

/// Emit file path to frontend when app receives a file via single-instance (frontend already loaded).
fn emit_file_open(app: &tauri::AppHandle, args: &[String]) {
    if let Some(path) = extract_json_path(args) {
        let _ = app.emit("file-open", path);
    }
}

/// Tauri command: frontend calls this on mount to retrieve any file path passed at startup.
/// Returns the path once, then clears it so it's not re-processed.
#[tauri::command]
fn get_startup_file(state: tauri::State<'_, StartupFile>) -> Option<String> {
    state.0.lock().unwrap().take()
}

struct StartupFile(Mutex<Option<String>>);

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_single_instance::init(|app, argv, _cwd| {
            // When a second instance is launched with a file, send it to the existing window
            emit_file_open(app, &argv);
            // Focus the existing window
            if let Some(window) = app.get_webview_window("main") {
                let _ = window.set_focus();
            }
        }))
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_http::init())
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_updater::Builder::new().build())
        .plugin(tauri_plugin_process::init())
        .invoke_handler(tauri::generate_handler![get_startup_file])
        .setup(|app| {
            // On first launch, store file path for frontend to retrieve when ready
            let args: Vec<String> = std::env::args().collect();
            let startup_path = extract_json_path(&args);
            app.manage(StartupFile(Mutex::new(startup_path)));
            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
