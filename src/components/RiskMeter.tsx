import React from 'react';
import { ShieldAlert } from 'lucide-react';
import { useI18n } from '@/i18n/I18nProvider';
import type { RiskLevel, RiskResult } from '@/lib/risk';

const LEVEL_STYLES: Record<RiskLevel, { bar: string; text: string }> = {
  low: { bar: 'bg-emerald-500', text: 'text-emerald-400' },
  medium: { bar: 'bg-amber-400', text: 'text-amber-300' },
  high: { bar: 'bg-orange-500', text: 'text-orange-400' },
  extreme: { bar: 'bg-red-500', text: 'text-red-400' },
};

interface RiskMeterProps {
  risk: RiskResult;
}

export const RiskMeter: React.FC<RiskMeterProps> = ({ risk }) => {
  const { t } = useI18n();
  const style = LEVEL_STYLES[risk.level];

  return (
    <div className="space-y-1.5 rounded-lg bg-[#1b1c28] border border-white/5 p-2.5">
      <div className="flex items-center justify-between text-xs">
        <span className="text-neutral-300 flex items-center gap-1.5">
          <ShieldAlert className={`w-3.5 h-3.5 ${style.text}`} />
          {t('risk.title')}
        </span>
        <span className={`font-mono font-bold ${style.text}`}>
          {risk.score}% · {t(`risk.${risk.level}`)}
        </span>
      </div>

      <div
        className="h-1.5 w-full rounded-full bg-[#242636] overflow-hidden"
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={risk.score}
      >
        <div
          className={`h-full rounded-full transition-all duration-300 ${style.bar}`}
          style={{ width: `${risk.score}%` }}
        />
      </div>

      <div className="flex items-start justify-between gap-3 text-[10px] text-neutral-500">
        <span className="leading-snug">{t('risk.note')}</span>
        <span className="font-mono flex-shrink-0">
          {t('risk.rate', { count: risk.gamesPerMinute.toFixed(1) })}
        </span>
      </div>
    </div>
  );
};
