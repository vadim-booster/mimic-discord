const isTauriRuntime = (): boolean =>
  typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window;

/** Desktop notification; silently does nothing outside the desktop app or without permission. */
export async function notify(title: string, body: string): Promise<void> {
  if (!isTauriRuntime()) return;
  try {
    const { isPermissionGranted, requestPermission, sendNotification } = await import(
      '@tauri-apps/plugin-notification'
    );
    let granted = await isPermissionGranted();
    if (!granted) granted = (await requestPermission()) === 'granted';
    if (granted) sendNotification({ title, body });
  } catch (err) {
    console.warn('Notification failed:', err);
  }
}

/** Scales the whole interface (webview zoom). */
export async function applyZoom(scale: number): Promise<void> {
  if (!isTauriRuntime()) return;
  try {
    const { getCurrentWebview } = await import('@tauri-apps/api/webview');
    await getCurrentWebview().setZoom(scale);
  } catch (err) {
    console.warn('Zoom failed:', err);
  }
}
