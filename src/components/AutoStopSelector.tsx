import React from 'react';
import { AlarmClock } from 'lucide-react';
import { useI18n } from '@/i18n/I18nProvider';
import { AUTO_STOP_PRESETS } from '@/lib/prefs';

interface AutoStopSelectorProps {
  minutes: number;
  disabled?: boolean;
  onChange: (minutes: number) => void;
}

export const AutoStopSelector: React.FC<AutoStopSelectorProps> = ({
  minutes,
  disabled,
  onChange,
}) => {
  const { t } = useI18n();

  const label = (m: number) =>
    m === 0
      ? t('autostop.off')
      : m < 60
      ? t('autostop.minutes', { count: m })
      : t('autostop.hours', { count: m / 60 });

  return (
    <div className="space-y-1.5">
      <div className="flex items-center gap-1.5 text-xs text-neutral-300">
        <AlarmClock className="w-3.5 h-3.5 text-[#5865F2]" />
        {t('autostop.title')}
      </div>
      <div className="grid grid-cols-6 gap-1">
        {AUTO_STOP_PRESETS.map((m) => (
          <button
            key={m}
            type="button"
            disabled={disabled}
            onClick={() => onChange(m)}
            className={`py-1 text-[10px] font-mono rounded border transition-all disabled:opacity-50 ${
              minutes === m
                ? 'bg-[#5865F2] text-white border-[#5865F2] font-semibold'
                : 'bg-[#1b1c28] text-neutral-400 border-white/10 hover:text-white'
            }`}
          >
            {label(m)}
          </button>
        ))}
      </div>
    </div>
  );
};
