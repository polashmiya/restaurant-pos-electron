import type { PrinterInfo } from '../../electron/types/electron';

export interface PrinterOption {
  value: string;
  label: string;
}

/**
 * Choices for a printer <select>: the default entry (empty value), every
 * installed printer, and a saved printer that is no longer installed (so
 * the setting stays visible). `missingLabel` marks that last entry; pass it
 * only once the printer list has loaded.
 */
export function printerSelectOptions(
  printers: readonly PrinterInfo[],
  current: string,
  defaultLabel: string,
  missingLabel?: (name: string) => string,
): PrinterOption[] {
  const options = [{ value: '', label: defaultLabel }, ...printers.map((entry) => ({ value: entry.name, label: entry.displayName }))];
  if (current && !printers.some((entry) => entry.name === current)) {
    options.push({ value: current, label: missingLabel ? missingLabel(current) : current });
  }
  return options;
}
