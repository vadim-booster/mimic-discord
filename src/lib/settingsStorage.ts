import type { SpoofMode, SpooferConfig } from '@/types/spoofer';

const STORAGE_KEY = 'mimic.settings.v1';
// Older versions only remembered this single checkbox.
const LEGACY_EXCLUDE_ADULT_KEY = 'mimic.exclude_adult';

export const DEFAULT_CONFIG: SpooferConfig = {
  limit: null,
  batch_size: 8,
  hold_duration_secs: 15,
  skip_previously_spoofed: true,
  // Native OS games only by default; other categories require the beta opt-in.
  spoof_mode: 'process_only',
  beta_enabled: false,
  cooldown_enabled: true,
  cooldown_every_n_batches: 25,
  cooldown_seconds: 30,
  jitter_enabled: false,
  exclude_adult: false,
};

/** The part of the config that is remembered between launches. */
export type PersistedSettings = Pick<
  SpooferConfig,
  | 'batch_size'
  | 'hold_duration_secs'
  | 'skip_previously_spoofed'
  | 'spoof_mode'
  | 'cooldown_enabled'
  | 'cooldown_every_n_batches'
  | 'cooldown_seconds'
  | 'jitter_enabled'
  | 'exclude_adult'
>;

const SPOOF_MODES: SpoofMode[] = ['hybrid', 'process_only', 'rpc_only'];

const clampInt = (value: unknown, min: number, max: number, fallback: number): number => {
  if (typeof value !== 'number' || !Number.isFinite(value)) return fallback;
  return Math.min(max, Math.max(min, Math.round(value)));
};

const asBool = (value: unknown, fallback: boolean): boolean =>
  typeof value === 'boolean' ? value : fallback;

/** Turns whatever was stored into a safe config; bad or missing values fall back to defaults. */
export function toPersisted(raw: unknown): PersistedSettings {
  const d = DEFAULT_CONFIG;
  const o = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>;
  return {
    batch_size: clampInt(o.batch_size, 1, 20, d.batch_size),
    hold_duration_secs: clampInt(o.hold_duration_secs, 5, 3600, d.hold_duration_secs),
    skip_previously_spoofed: asBool(o.skip_previously_spoofed, d.skip_previously_spoofed ?? true),
    spoof_mode: SPOOF_MODES.includes(o.spoof_mode as SpoofMode)
      ? (o.spoof_mode as SpoofMode)
      : d.spoof_mode,
    cooldown_enabled: asBool(o.cooldown_enabled, d.cooldown_enabled),
    cooldown_every_n_batches: clampInt(o.cooldown_every_n_batches, 10, 100, d.cooldown_every_n_batches),
    cooldown_seconds: clampInt(o.cooldown_seconds, 10, 120, d.cooldown_seconds),
    jitter_enabled: asBool(o.jitter_enabled, d.jitter_enabled),
    exclude_adult: asBool(o.exclude_adult, d.exclude_adult ?? false),
  };
}

export function loadConfig(): SpooferConfig {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      return { ...DEFAULT_CONFIG, ...toPersisted(JSON.parse(stored)) };
    }
    // First launch after the update: keep the old 18+ choice.
    if (localStorage.getItem(LEGACY_EXCLUDE_ADULT_KEY) === 'true') {
      return { ...DEFAULT_CONFIG, exclude_adult: true };
    }
  } catch {
    // storage unavailable or corrupted: fall through to defaults
  }
  return { ...DEFAULT_CONFIG };
}

export function saveConfig(config: SpooferConfig): void {
  try {
    const persisted = toPersisted(config);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(persisted));
  } catch {
    // storage unavailable: settings just last for this session
  }
}
