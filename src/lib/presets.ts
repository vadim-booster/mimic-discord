import { toPersisted, type PersistedSettings } from '@/lib/settingsStorage';

const STORAGE_KEY = 'mimic.presets.v1';

export const MAX_PRESETS = 12;
export const MAX_PRESET_NAME = 24;

export interface Preset {
  id: string;
  name: string;
  settings: PersistedSettings;
}

export function loadPresets(): Preset[] {
  try {
    const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '[]');
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter((p) => p && typeof p.id === 'string' && typeof p.name === 'string')
      .slice(0, MAX_PRESETS)
      .map((p) => ({
        id: p.id,
        name: p.name.slice(0, MAX_PRESET_NAME),
        settings: toPersisted(p.settings),
      }));
  } catch {
    return [];
  }
}

export function savePresets(presets: Preset[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(presets));
  } catch {
    // storage unavailable: presets just last for this session
  }
}
