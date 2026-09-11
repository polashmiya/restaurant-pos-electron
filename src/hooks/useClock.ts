import { useEffect, useState } from 'react';
import { APP_CONFIG } from '@/config/app.config';

/** Current time, refreshed periodically (header clock, "since" labels). */
export function useClock(tickMs: number = APP_CONFIG.ui.clockTickMs): Date {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), tickMs);
    return () => window.clearInterval(timer);
  }, [tickMs]);
  return now;
}
