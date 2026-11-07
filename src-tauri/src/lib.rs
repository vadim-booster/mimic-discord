pub mod commands;
pub mod discord;
pub mod history;
pub mod i18n;
pub mod rpc;
pub mod spoofer;
pub mod state;

use std::sync::atomic::Ordering;
use std::sync::Mutex;

use state::AppState;
use tauri::menu::{Menu, MenuItem};
use tauri::tray::{MouseButton, MouseButtonState, TrayIconBuilder, TrayIconEvent};
use tauri::{AppHandle, Manager, WindowEvent};

/// Tray menu entries, kept so their labels can follow the language picked in Settings.
struct TrayItems {
    show: MenuItem<tauri::Wry>,
    pause: MenuItem<tauri::Wry>,
    resume: MenuItem<tauri::Wry>,
    stop: MenuItem<tauri::Wry>,
    quit: MenuItem<tauri::Wry>,
}

struct TrayHandle(Mutex<Option<TrayItems>>);

fn show_main_window(app: &AppHandle) {
    if let Some(window) = app.get_webview_window("main") {
        let _ = window.show();
        let _ = window.unminimize();
        let _ = window.set_focus();
    }
}

fn apply_tray_labels(items: &TrayItems) {
    let _ = items.show.set_text(i18n::pick("Показать окно", "Show window"));
    let _ = items.pause.set_text(i18n::pick("Пауза", "Pause"));
    let _ = items.resume.set_text(i18n::pick("Продолжить", "Resume"));
    let _ = items.stop.set_text(i18n::pick("Остановить", "Stop"));
    let _ = items.quit.set_text(i18n::pick("Выход", "Quit"));
}

/// Re-labels the tray menu after the UI language changed.
pub fn refresh_tray_labels(app: &AppHandle) {
    if let Some(handle) = app.try_state::<TrayHandle>() {
        if let Ok(guard) = handle.0.lock() {
            if let Some(items) = guard.as_ref() {
                apply_tray_labels(items);
            }
        }
    }
}

fn setup_tray(app: &AppHandle) -> tauri::Result<()> {
    let show = MenuItem::with_id(app, "show", "Show window", true, None::<&str>)?;
    let pause = MenuItem::with_id(app, "pause", "Pause", true, None::<&str>)?;
    let resume = MenuItem::with_id(app, "resume", "Resume", true, None::<&str>)?;
    let stop = MenuItem::with_id(app, "stop", "Stop", true, None::<&str>)?;
    let quit = MenuItem::with_id(app, "quit", "Quit", true, None::<&str>)?;
    let menu = Menu::with_items(app, &[&show, &pause, &resume, &stop, &quit])?;

    let mut builder = TrayIconBuilder::new()
        .tooltip("mimic")
        .menu(&menu)
        .show_menu_on_left_click(false)
        .on_menu_event(|app, event| match event.id.as_ref() {
            "show" => show_main_window(app),
            "pause" => {
                let app = app.clone();
                tauri::async_runtime::spawn(async move {
                    let state = app.state::<AppState>();
                    let _ = commands::pause_spoofer(state, app.clone()).await;
                });
            }
            "resume" => {
                let app = app.clone();
                tauri::async_runtime::spawn(async move {
                    let state = app.state::<AppState>();
                    let _ = commands::resume_spoofer(state, app.clone()).await;
                });
            }
            "stop" => {
                let app = app.clone();
                tauri::async_runtime::spawn(async move {
                    let state = app.state::<AppState>();
                    let _ = commands::stop_spoofer(state, app.clone()).await;
                });
            }
            "quit" => {
                // Stop first so the dummy processes are cleaned up, then leave.
                let app = app.clone();
                tauri::async_runtime::spawn(async move {
                    let state = app.state::<AppState>();
                    let _ = commands::stop_spoofer(state, app.clone()).await;
                    app.exit(0);
                });
            }
            _ => {}
        })
        .on_tray_icon_event(|tray, event| {
            if let TrayIconEvent::Click {
                button: MouseButton::Left,
                button_state: MouseButtonState::Up,
                ..
            } = event
            {
                show_main_window(tray.app_handle());
            }
        });

    if let Some(icon) = app.default_window_icon() {
        builder = builder.icon(icon.clone());
    }
    builder.build(app)?;

    let items = TrayItems { show, pause, resume, stop, quit };
    apply_tray_labels(&items);
    if let Some(handle) = app.try_state::<TrayHandle>() {
        if let Ok(mut guard) = handle.0.lock() {
            *guard = Some(items);
        }
    }
    Ok(())
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_notification::init())
        .manage(AppState::new())
        .manage(TrayHandle(Mutex::new(None)))
        .setup(|app| {
            // A missing tray (e.g. no appindicator on Linux) must never stop the app from starting.
            match setup_tray(app.handle()) {
                Ok(()) => {
                    app.state::<AppState>()
                        .tray_available
                        .store(true, Ordering::SeqCst);
                }
                Err(err) => eprintln!("mimic: tray icon unavailable: {err}"),
            }
            Ok(())
        })
        .on_window_event(|window, event| {
            if let WindowEvent::CloseRequested { api, .. } = event {
                let state = window.state::<AppState>();
                // Only hide when there is a tray icon to bring the window back.
                if state.close_to_tray.load(Ordering::SeqCst)
                    && state.tray_available.load(Ordering::SeqCst)
                {
                    api.prevent_close();
                    let _ = window.hide();
                }
            }
        })
        .invoke_handler(tauri::generate_handler![
            commands::fetch_games,
            commands::get_games_list,
            commands::start_spoofer,
            commands::pause_spoofer,
            commands::resume_spoofer,
            commands::stop_spoofer,
            commands::check_discord_status,
            commands::get_spoofer_state,
            commands::clear_history,
            commands::export_history,
            commands::import_history,
            commands::open_external_url,
            commands::set_language,
            commands::set_close_to_tray,
        ])
        .run(tauri::generate_context!())
        .expect("error while running mimic desktop application");
}
