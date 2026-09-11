import { useCallback, useEffect, useState } from 'react';
import { logError } from '@/utils/errors';
import type { PrinterInfo } from '../../electron/types/electron';

export interface PrintersState {
  printers: PrinterInfo[];
  /** True until the operating system answered (always false in the browser). */
  loading: boolean;
  /** Asks the operating system for the installed printers again. */
  refresh: () => void;
}

/** Printers installed on this computer (desktop app only). */
export function usePrinters(): PrintersState {
  const [printers, setPrinters] = useState<PrinterInfo[]>([]);
  const [loading, setLoading] = useState(() => window.electronAPI !== undefined);

  /** State updates happen asynchronously, after the operating system answered. */
  const load = useCallback((): Promise<void> => {
    const api = window.electronAPI;
    if (!api) return Promise.resolve();
    return api.print
      .getPrinters()
      .then(setPrinters, (error: unknown) => {
        logError('printers', error);
        setPrinters([]);
      })
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const refresh = useCallback(() => {
    setLoading(true);
    void load();
  }, [load]);

  return { printers, loading, refresh };
}
