import { useCallback, useEffect, useState } from 'react';
import {
  loadPresets,
  savePresets,
  MAX_PRESETS,
  MAX_PRESET_NAME,
  type Preset,
} from '@/lib/presets';
import { toPersisted } from '@/lib/settingsStorage';
import type { SpooferConfig } from '@/types/spoofer';

export function usePresets() {
  const [presets, setPresets] = useState<Preset[]>(loadPresets);

  useEffect(() => {
    savePresets(presets);
  }, [presets]);

  /** Saves the current settings under a name; an existing name is overwritten. */
  const savePreset = useCallback((name: string, config: SpooferConfig): boolean => {
    const clean = name.trim().slice(0, MAX_PRESET_NAME);
    if (!clean) return false;
    let saved = true;
    setPresets((prev) => {
      const existing = prev.find((p) => p.name.toLowerCase() === clean.toLowerCase());
      if (existing) {
        return prev.map((p) => (p.id === existing.id ? { ...p, settings: toPersisted(config) } : p));
      }
      if (prev.length >= MAX_PRESETS) {
        saved = false;
        return prev;
      }
      return [...prev, { id: `${Date.now()}-${prev.length}`, name: clean, settings: toPersisted(config) }];
    });
    return saved;
  }, []);

  const deletePreset = useCallback((id: string) => {
    setPresets((prev) => prev.filter((p) => p.id !== id));
  }, []);

  return { presets, savePreset, deletePreset };
}
