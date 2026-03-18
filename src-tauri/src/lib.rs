use tauri::{Emitter, Manager};

/// Emit file path to frontend when app receives a file via CLI args or single-instance.
fn emit_file_open(app: &tauri::AppHandle, args: &[String]) {
    // First arg is the executable path, subsequent args are file paths from OS file association
    for arg in args.iter().skip(1) {
        let path = std::path::Path::new(arg);
        if path.extension().is_some_and(|ext| ext == "json") && path.exists() {
            let _ = app.emit("file-open", arg.clone());
            break;
        }
    }
}

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
        .invoke_handler(tauri::generate_handler![])
        .setup(|app| {
            // On first launch, check if a file path was passed via CLI
            let args: Vec<String> = std::env::args().collect();
            emit_file_open(app.handle(), &args);
            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
