import React from 'react';
import { ClipboardCheck } from 'lucide-react';
import { useI18n } from '@/i18n/I18nProvider';
import type { SessionSummary } from '@/hooks/useSessionSummary';

export function formatClock(totalSecs: number): string {
  const secs = Math.max(0, Math.round(totalSecs));
  const hours = Math.floor(secs / 3600);
  const minutes = Math.floor((secs % 3600) / 60);
  const seconds = secs % 60;
  return [hours, minutes, seconds].map((part) => String(part).padStart(2, '0')).join(':');
}

interface SessionSummaryDialogProps {
  summary: SessionSummary | null;
  onClose: () => void;
}

export const SessionSummaryDialog: React.FC<SessionSummaryDialogProps> = ({ summary, onClose }) => {
  const { t, formatNumber } = useI18n();
  if (!summary) return null;

  const perMinute =
    summary.durationSecs > 0 ? (summary.succeeded * 60) / summary.durationSecs : 0;

  const rows: Array<[string, string, string?]> = [
    [t('summary.games'), formatNumber(summary.processed)],
    [t('summary.succeeded'), formatNumber(summary.succeeded), 'text-emerald-400'],
    [t('summary.failed'), formatNumber(summary.failed), summary.failed > 0 ? 'text-red-400' : undefined],
    [t('summary.duration'), formatClock(summary.durationSecs)],
  ];
  if (!summary.isFarm) {
    rows.push([t('summary.speed'), t('risk.rate', { count: perMinute.toFixed(1) })]);
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
      role="dialog"
      aria-modal="true"
      onClick={onClose}
    >
      <div
        className="w-full max-w-sm rounded-xl border border-[#232535] bg-[#161722] p-5 shadow-xl space-y-4"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-2">
          <ClipboardCheck className="w-4 h-4 text-[#5865F2]" />
          <div>
            <h3 className="text-sm font-semibold text-white">{t('summary.title')}</h3>
            <p className="text-[11px] text-neutral-400">{t(`summary.${summary.outcome}`)}</p>
          </div>
        </div>

        <div className="space-y-1.5">
          {rows.map(([label, value, color]) => (
            <div
              key={label}
              className="flex items-center justify-between rounded-lg bg-[#1b1c28] border border-white/5 px-3 py-1.5 text-xs"
            >
              <span className="text-neutral-400">{label}</span>
              <span className={`font-mono font-semibold ${color ?? 'text-white'}`}>{value}</span>
            </div>
          ))}
        </div>

        <button
          type="button"
          onClick={onClose}
          className="w-full py-2 rounded-lg bg-[#5865F2] hover:bg-[#4752c4] text-white text-xs font-semibold transition-all"
        >
          {t('summary.close')}
        </button>
      </div>
    </div>
  );
};
