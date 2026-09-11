import { APP_CONFIG } from '@/config/app.config';
import { toWesternDigits } from './format';

export type KeypadKey = '0' | '1' | '2' | '3' | '4' | '5' | '6' | '7' | '8' | '9' | '00' | '.' | 'backspace';


/** Applies a keypad key to an amount string (one dot, max 2 decimals). */
export function applyKeypadKey(current: string, key: KeypadKey, maxLength: number = APP_CONFIG.payment.maxAmountLength): string {
  if (key === 'backspace') return current.slice(0, -1);
  if (key === '.') return current.includes('.') ? current : `${current || '0'}.`;
  let next = `${current}${key}`;
  // Strip leading zeros of the integer part ("007" → "7", "00" → "0").
  if (!next.includes('.')) next = next.replace(/^0+(?=\d)/, '');
  const decimals = next.split('.')[1] ?? '';
  if (decimals.length > 2 || next.length > maxLength) return current;
  return next;
}

/** Cleans typed input (Bangla digits allowed) into a keypad-compatible amount string. */
export function sanitizeAmountText(raw: string, maxLength: number = APP_CONFIG.payment.maxAmountLength): string {
  const western = toWesternDigits(raw).replace(/[^\d.]/g, '');
  const [integer = '', ...rest] = western.split('.');
  const decimals = rest.join('').slice(0, 2);
  const cleanInteger = integer.replace(/^0+(?=\d)/, '');
  const result = rest.length > 0 ? `${cleanInteger || '0'}.${decimals}` : cleanInteger;
  return result.slice(0, maxLength);
}

export function amountFromText(text: string): number | null {
  if (text === '' || text === '.') return null;
  const value = Number(text);
  return Number.isFinite(value) ? value : null;
}
