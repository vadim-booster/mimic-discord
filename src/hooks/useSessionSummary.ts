import { useCallback, useEffect, useRef, useState } from 'react';
import type { SpooferStatus, SpooferTickEvent } from '@/types/spoofer';

export type SessionOutcome = 'finished' | 'stopped' | 'timer' | 'error';

export interface SessionSummary {
  outcome: SessionOutcome;
  isFarm: boolean;
  /** Games that were started (or farmed) during the run. */
  processed: number;
  succeeded: number;
  failed: number;
  durationSecs: number;
}

const isActive = (s: SpooferStatus) => s === 'running' || s === 'paused';

/**
 * Collects numbers while a run is going and produces a summary when it ends.
 * The backend zeroes its counters on stop, so the highest values seen are kept here.
 */
export function useSessionSummary(
  status: SpooferStatus,
  tickData: SpooferTickEvent,
  isFarmRun: boolean
) {
  const [summary, setSummary] = useState<SessionSummary | null>(null);
  const prevStatus = useRef<SpooferStatus>(status);
  const peak = useRef({ processed: 0, succeeded: 0, failed: 0, elapsed: 0 });
  const timerStop = useRef(false);

  useEffect(() => {
    if (!isActive(status)) return;
    const p = peak.current;
    p.processed = Math.max(p.processed, tickData.current_index);
    p.succeeded = Math.max(p.succeeded, tickData.succeeded_count ?? 0);
    p.failed = Math.max(p.failed, tickData.failed_count ?? 0);
    p.elapsed = Math.max(p.elapsed, tickData.elapsed_secs);
  }, [status, tickData]);

  useEffect(() => {
    const prev = prevStatus.current;
    prevStatus.current = status;

    if (!isActive(prev) && status === 'running') {
      peak.current = { processed: 0, succeeded: 0, failed: 0, elapsed: 0 };
      timerStop.current = false;
      setSummary(null);
      return;
    }

    if (isActive(prev) && !isActive(status)) {
      const p = peak.current;
      // A run that was stopped right away is not worth a report.
      if (p.processed === 0 && p.succeeded === 0 && p.failed === 0 && p.elapsed < 10) return;
      const outcome: SessionOutcome =
        status === 'error'
          ? 'error'
          : status === 'finished'
          ? 'finished'
          : timerStop.current
          ? 'timer'
          : 'stopped';
      setSummary({
        outcome,
        isFarm: isFarmRun,
        processed: p.processed,
        succeeded: p.succeeded,
        failed: p.failed,
        durationSecs: p.elapsed,
      });
    }
  }, [status, isFarmRun]);

  const markTimerStop = useCallback(() => {
    timerStop.current = true;
  }, []);

  const dismiss = useCallback(() => setSummary(null), []);

  return { summary, dismiss, markTimerStop };
}
