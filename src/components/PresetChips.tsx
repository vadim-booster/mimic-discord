import React from 'react';
import { Bookmark } from 'lucide-react';
import { useI18n } from '@/i18n/I18nProvider';
import type { Preset } from '@/lib/presets';

interface PresetChipsProps {
  presets: Preset[];
  disabled?: boolean;
  onApply: (preset: Preset) => void;
}

export const PresetChips: React.FC<PresetChipsProps> = ({ presets, disabled, onApply }) => {
  const { t } = useI18n();
  if (presets.length === 0) return null;

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      <span className="text-xs text-neutral-300 flex items-center gap-1.5 mr-1">
        <Bookmark className="w-3.5 h-3.5 text-[#5865F2]" />
        {t('dashboard.presets')}
      </span>
      {presets.map((preset) => (
        <button
          key={preset.id}
          type="button"
          disabled={disabled}
          onClick={() => onApply(preset)}
          className="px-2 py-0.5 text-[10px] rounded border bg-[#1b1c28] text-neutral-300 border-white/10 hover:text-white hover:border-[#5865F2]/60 disabled:opacity-50 transition-all"
        >
          {preset.name}
        </button>
      ))}
    </div>
  );
};
