const STORAGE_KEY = 'mimic.prefs.v1';

/** App-level preferences that never go to the Rust backend as part of the run config. */
export interface AppPrefs {
  /** Main-mode auto-stop timer in minutes; 0 = off. */
  auto_stop_minutes: number;
  /** Desktop notification when a run ends (only if the window is not focused). */
  notify_on_finish: boolean;
  /** Close button hides the window to the system tray instead of quitting. */
  close_to_tray: boolean;
  /** Interface zoom factor. */
  ui_scale: number;
  /** Game ids that are never spoofed. */
  blacklist: string[];
  /** Game ids marked with a star. */
  favorites: string[];
}

export const AUTO_STOP_PRESETS = [0, 15, 30, 60, 120, 240];
export const MIN_UI_SCALE = 0.8;
export const MAX_UI_SCALE = 1.3;

export const DEFAULT_PREFS: AppPrefs = {
  auto_stop_minutes: 0,
  notify_on_finish: true,
  close_to_tray: false,
  ui_scale: 1,
  blacklist: [],
  favorites: [],
};

const idList = (value: unknown): string[] =>
  Array.isArray(value)
    ? Array.from(new Set(value.filter((v): v is string => typeof v === 'string')))
    : [];

function sanitize(raw: unknown): AppPrefs {
  const o = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>;
  const scale = typeof o.ui_scale === 'number' && Number.isFinite(o.ui_scale) ? o.ui_scale : 1;
  const minutes =
    typeof o.auto_stop_minutes === 'number' && AUTO_STOP_PRESETS.includes(o.auto_stop_minutes)
      ? o.auto_stop_minutes
      : 0;
  const blacklist = idList(o.blacklist);
  return {
    auto_stop_minutes: minutes,
    notify_on_finish:
      typeof o.notify_on_finish === 'boolean' ? o.notify_on_finish : DEFAULT_PREFS.notify_on_finish,
    close_to_tray: typeof o.close_to_tray === 'boolean' ? o.close_to_tray : false,
    ui_scale: Math.min(MAX_UI_SCALE, Math.max(MIN_UI_SCALE, Math.round(scale * 20) / 20)),
    blacklist,
    // A game cannot be both a favorite and blacklisted.
    favorites: idList(o.favorites).filter((id) => !blacklist.includes(id)),
  };
}

export function loadPrefs(): AppPrefs {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) return sanitize(JSON.parse(stored));
  } catch {
    // storage unavailable or corrupted
  }
  return { ...DEFAULT_PREFS };
}

export function savePrefs(prefs: AppPrefs): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(sanitize(prefs)));
  } catch {
    // storage unavailable: preferences just last for this session
  }
}
