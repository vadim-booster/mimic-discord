import React, { useEffect, useMemo, useState } from 'react';
import { Bell, EyeOff, Bookmark, Trash2, Minimize2, ZoomIn, Save, X } from 'lucide-react';
import { useI18n } from '@/i18n/I18nProvider';
import { tauriApi } from '@/lib/tauri';
import { MAX_UI_SCALE, MIN_UI_SCALE, type AppPrefs } from '@/lib/prefs';
import { MAX_PRESETS, MAX_PRESET_NAME, type Preset } from '@/lib/presets';

interface SettingsExtrasProps {
  prefs: AppPrefs;
  onPrefsChange: (patch: Partial<AppPrefs>) => void;
  onToggleBlacklist: (id: string) => void;
  presets: Preset[];
  onSavePreset: (name: string) => boolean;
  onDeletePreset: (id: string) => void;
  onApplyPreset: (preset: Preset) => void;
}

const Toggle: React.FC<{
  title: string;
  desc: string;
  icon: React.ReactNode;
  checked: boolean;
  onChange: (checked: boolean) => void;
}> = ({ title, desc, icon, checked, onChange }) => (
  <div className="flex items-center justify-between p-3.5 rounded-lg bg-[#1b1c28] border border-white/5">
    <div className="pr-4">
      <div className="text-xs font-semibold text-white flex items-center gap-2">
        {icon}
        {title}
      </div>
      <div className="text-[11px] text-neutral-400 mt-0.5">{desc}</div>
    </div>
    <input
      type="checkbox"
      checked={checked}
      onChange={(e) => onChange(e.target.checked)}
      className="w-5 h-5 flex-shrink-0 rounded bg-[#242636] border-white/20 text-[#5865F2] focus:ring-[#5865F2] cursor-pointer"
    />
  </div>
);

export const SettingsExtras: React.FC<SettingsExtrasProps> = ({
  prefs,
  onPrefsChange,
  onToggleBlacklist,
  presets,
  onSavePreset,
  onDeletePreset,
  onApplyPreset,
}) => {
  const { t } = useI18n();
  const [presetName, setPresetName] = useState('');
  const [presetError, setPresetError] = useState(false);
  const [names, setNames] = useState<Record<string, string>>({});

  // The blacklist stores ids only; names come from the game database.
  useEffect(() => {
    if (prefs.blacklist.length === 0) return;
    tauriApi
      .getGamesList()
      .then((list) => setNames(Object.fromEntries(list.map((g) => [g.id, g.name]))))
      .catch(() => undefined);
  }, [prefs.blacklist.length]);

  const blacklistRows = useMemo(
    () => prefs.blacklist.map((id) => ({ id, name: names[id] ?? id })),
    [prefs.blacklist, names]
  );

  const handleSavePreset = () => {
    const ok = presetName.trim() !== '' && onSavePreset(presetName);
    setPresetError(!ok && presetName.trim() !== '');
    if (ok) setPresetName('');
  };

  return (
    <>
      <Toggle
        title={t('settings.notify')}
        desc={t('settings.notifyDesc')}
        icon={<Bell className="w-3.5 h-3.5 text-[#5865F2]" />}
        checked={prefs.notify_on_finish}
        onChange={(checked) => onPrefsChange({ notify_on_finish: checked })}
      />

      <Toggle
        title={t('settings.tray')}
        desc={t('settings.trayDesc')}
        icon={<Minimize2 className="w-3.5 h-3.5 text-[#5865F2]" />}
        checked={prefs.close_to_tray}
        onChange={(checked) => onPrefsChange({ close_to_tray: checked })}
      />

      {/* Interface scale */}
      <div className="p-3.5 rounded-lg bg-[#1b1c28] border border-white/5 space-y-2">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-xs font-semibold text-white flex items-center gap-2">
              <ZoomIn className="w-3.5 h-3.5 text-[#5865F2]" />
              {t('settings.scale')}
            </div>
            <div className="text-[11px] text-neutral-400 mt-0.5">{t('settings.scaleDesc')}</div>
          </div>
          <span className="font-mono text-xs text-white">
            {t('settings.scaleValue', { percent: Math.round(prefs.ui_scale * 100) })}
          </span>
        </div>
        <input
          type="range"
          min={MIN_UI_SCALE}
          max={MAX_UI_SCALE}
          step={0.05}
          value={prefs.ui_scale}
          onChange={(e) => onPrefsChange({ ui_scale: Number(e.target.value) })}
          className="w-full h-1.5 rounded-lg appearance-none cursor-pointer bg-[#242636] accent-[#5865F2]"
        />
      </div>

      {/* Presets */}
      <div className="p-3.5 rounded-lg bg-[#1b1c28] border border-white/5 space-y-3">
        <div>
          <div className="text-xs font-semibold text-white flex items-center gap-2">
            <Bookmark className="w-3.5 h-3.5 text-[#5865F2]" />
            {t('presets.title')}
          </div>
          <div className="text-[11px] text-neutral-400 mt-0.5">
            {t('presets.desc', { count: MAX_PRESETS })}
          </div>
        </div>

        <div className="flex items-center gap-2">
          <input
            type="text"
            value={presetName}
            maxLength={MAX_PRESET_NAME}
            placeholder={t('presets.nameHint')}
            onChange={(e) => {
              setPresetName(e.target.value);
              setPresetError(false);
            }}
            onKeyDown={(e) => e.key === 'Enter' && handleSavePreset()}
            className="flex-1 bg-[#242636] border border-white/10 rounded-lg px-3 py-1.5 text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-[#5865F2]"
          />
          <button
            type="button"
            onClick={handleSavePreset}
            disabled={presetName.trim() === ''}
            className="p-2 rounded-lg bg-[#242636] hover:bg-white/5 text-neutral-200 text-xs flex items-center gap-1.5 border border-white/10 disabled:opacity-40 transition-all"
          >
            <Save className="w-3.5 h-3.5 text-emerald-400" />
            <span>{t('presets.save')}</span>
          </button>
        </div>
        {presetError && <div className="text-[11px] text-amber-400">{t('presets.full')}</div>}

        {presets.length === 0 ? (
          <div className="text-[11px] text-neutral-500">{t('presets.empty')}</div>
        ) : (
          <div className="space-y-1.5">
            {presets.map((preset) => (
              <div
                key={preset.id}
                className="flex items-center justify-between gap-2 p-2 rounded-lg bg-[#242636] border border-white/5 text-xs"
              >
                <div className="min-w-0">
                  <div className="text-white font-medium truncate">{preset.name}</div>
                  <div className="text-[10px] font-mono text-neutral-500">
                    {preset.settings.batch_size}× · {preset.settings.hold_duration_secs}s
                  </div>
                </div>
                <div className="flex items-center gap-1.5 flex-shrink-0">
                  <button
                    type="button"
                    onClick={() => onApplyPreset(preset)}
                    className="px-2 py-1 rounded bg-[#5865F2]/20 border border-[#5865F2]/40 text-[11px] text-white hover:bg-[#5865F2]/30 transition-all"
                  >
                    {t('presets.apply')}
                  </button>
                  <button
                    type="button"
                    onClick={() => onDeletePreset(preset.id)}
                    className="p-1 rounded text-neutral-400 hover:text-red-400 hover:bg-white/5"
                    title={t('presets.delete')}
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Blacklist */}
      <div className="p-3.5 rounded-lg bg-[#1b1c28] border border-white/5 space-y-3">
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="text-xs font-semibold text-white flex items-center gap-2">
              <EyeOff className="w-3.5 h-3.5 text-[#5865F2]" />
              {t('settings.blacklistTitle', { count: prefs.blacklist.length })}
            </div>
            <div className="text-[11px] text-neutral-400 mt-0.5">{t('settings.blacklistDesc')}</div>
          </div>
          <button
            type="button"
            onClick={() => onPrefsChange({ blacklist: [] })}
            disabled={prefs.blacklist.length === 0}
            className="p-2 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-400 text-xs flex items-center gap-1.5 border border-red-500/20 disabled:opacity-40 transition-all flex-shrink-0"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>{t('settings.clear')}</span>
          </button>
        </div>

        {blacklistRows.length === 0 ? (
          <div className="text-[11px] text-neutral-500">{t('settings.blacklistEmpty')}</div>
        ) : (
          <div className="max-h-40 overflow-y-auto pr-1 space-y-1">
            {blacklistRows.map((row) => (
              <div
                key={row.id}
                className="flex items-center justify-between gap-2 px-2 py-1.5 rounded bg-[#242636] border border-white/5 text-xs"
              >
                <span className="text-white truncate">{row.name}</span>
                <button
                  type="button"
                  onClick={() => onToggleBlacklist(row.id)}
                  className="p-0.5 rounded text-neutral-400 hover:text-white hover:bg-white/5 flex-shrink-0"
                  title={t('database.unban')}
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  );
};
