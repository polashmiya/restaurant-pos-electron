import { toWesternDigits } from './format';

/** Parses user input, accepting Bangla digits (০-৯) and "," separators. */
export function parseNumberInput(raw: string): number | null {
  const normalized = toWesternDigits(raw).replace(/,/g, '').trim();
  if (normalized === '' || normalized === '.' || normalized === '-') return null;
  if (!/^-?\d*\.?\d*$/.test(normalized)) return null;
  const value = Number(normalized);
  return Number.isFinite(value) ? value : null;
}

/** Validates a local "HH:mm" time string. */
export function isValidTime(value: string): boolean {
  const match = /^(\d{1,2}):(\d{2})$/.exec(toWesternDigits(value.trim()));
  if (!match) return false;
  const hours = Number(match[1]);
  const minutes = Number(match[2]);
  return hours >= 0 && hours <= 23 && minutes >= 0 && minutes <= 59;
}

/** Loose phone validation: 6–20 digits with optional +, spaces, dashes. */
export function isValidPhone(value: string): boolean {
  const normalized = toWesternDigits(value.trim());
  if (!/^\+?[\d\s()-]+$/.test(normalized)) return false;
  const digits = normalized.replace(/\D/g, '');
  return digits.length >= 6 && digits.length <= 20;
}
