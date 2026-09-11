/**
 * Money helpers. All arithmetic is done in integer minor units (paisa/cents)
 * to avoid floating point errors such as 0.1 + 0.2 = 0.30000000000000004.
 */

/** Converts an amount to integer minor units (2 decimal places). */
export function toMinor(amount: number): number {
  if (!Number.isFinite(amount)) return 0;
  return Math.round((amount + Number.EPSILON * Math.sign(amount)) * 100);
}

/** Converts integer minor units back to a decimal amount. */
export function fromMinor(minor: number): number {
  return minor / 100;
}

/** Rounds a monetary amount to 2 decimal places (half away from zero). */
export function roundMoney(amount: number): number {
  return fromMinor(toMinor(amount));
}

/** Sums monetary amounts without floating point drift. */
export function sumMoney(amounts: readonly number[]): number {
  return fromMinor(amounts.reduce((total, amount) => total + toMinor(amount), 0));
}

/** Clamps an amount into [min, max]. */
export function clampMoney(amount: number, min: number, max: number): number {
  return Math.min(Math.max(amount, min), max);
}
