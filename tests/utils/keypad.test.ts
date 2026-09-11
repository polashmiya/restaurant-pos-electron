import { describe, expect, it } from 'vitest';
import { amountFromText, applyKeypadKey, sanitizeAmountText } from '@/utils/keypad';

describe('payment keypad', () => {
  const type = (keys: Parameters<typeof applyKeypadKey>[1][]) => keys.reduce((text, key) => applyKeypadKey(text, key), '');

  it('builds amounts from key presses', () => {
    expect(type(['1', '0', '00'])).toBe('1000');
    expect(type(['5', '.', '2', '5'])).toBe('5.25');
    expect(type(['.', '5'])).toBe('0.5');
  });

  it('ignores leading zeros, a second dot and a third decimal', () => {
    expect(type(['0', '0', '7'])).toBe('7');
    expect(type(['00'])).toBe('0');
    expect(type(['1', '.', '.', '5'])).toBe('1.5');
    expect(type(['1', '.', '2', '5', '9'])).toBe('1.25');
  });

  it('supports backspace', () => {
    expect(applyKeypadKey('125', 'backspace')).toBe('12');
    expect(applyKeypadKey('', 'backspace')).toBe('');
  });

  it('sanitizes typed input including Bangla digits', () => {
    expect(sanitizeAmountText('১০০০')).toBe('1000');
    expect(sanitizeAmountText('1,250.759')).toBe('1250.75');
    expect(sanitizeAmountText('abc')).toBe('');
    expect(amountFromText('')).toBeNull();
    expect(amountFromText('12.5')).toBe(12.5);
  });
});
