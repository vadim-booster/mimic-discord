import { useEffect, useRef } from 'react';
import type { SpooferStatus } from '@/types/spoofer';

/**
 * Calls `onTrigger` once after the run has been active (not paused) for `minutes`.
 * Uses its own 1-second clock, so it does not depend on how often the backend sends ticks.
 */
export function useAutoStop(
  status: SpooferStatus,
  minutes: number,
  enabled: boolean,
  onTrigger: () => void
) {
  const activeSecs = useRef(0);
  const fired = useRef(false);
  const callback = useRef(onTrigger);
  callback.current = onTrigger;

  // A new run starts from zero.
  useEffect(() => {
    if (status === 'idle' || status === 'finished' || status === 'error') {
      activeSecs.current = 0;
      fired.current = false;
    }
  }, [status]);

  useEffect(() => {
    if (!enabled || minutes <= 0 || status !== 'running') return;
    const timer = window.setInterval(() => {
      activeSecs.current += 1;
      if (!fired.current && activeSecs.current >= minutes * 60) {
        fired.current = true;
        callback.current();
      }
    }, 1000);
    return () => window.clearInterval(timer);
  }, [status, minutes, enabled]);
}
