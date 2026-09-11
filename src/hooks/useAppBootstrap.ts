import { useCallback, useEffect, useState } from 'react';
import { loadApplicationData } from '@/services/bootstrap';
import { startDraftSync } from '@/services/draftSync';
import { logError } from '@/utils/errors';

export type BootstrapState = 'loading' | 'ready' | 'error';

/**
 * Startup (master spec §73): load settings, shift, tables and orders from
 * local storage, apply the saved language/theme, then open the POS.
 */
export function useAppBootstrap(): { state: BootstrapState; retry: () => void } {
  const [state, setState] = useState<BootstrapState>('loading');
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let cancelled = false;
    let stopSync: (() => void) | null = null;

    loadApplicationData()
      .then(() => {
        if (cancelled) return;
        stopSync = startDraftSync();
        setState('ready');
      })
      .catch((error: unknown) => {
        logError('bootstrap', error);
        if (!cancelled) setState('error');
      });

    return () => {
      cancelled = true;
      stopSync?.();
    };
  }, [attempt]);

  const retry = useCallback(() => {
    setState('loading');
    setAttempt((value) => value + 1);
  }, []);

  return { state, retry };
}
