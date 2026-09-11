import { message } from '@/i18n/keys';
import { toast } from '@/store/uiStore';
import { getErrorMessageKey, logError } from '@/utils/errors';
import { playSound } from './sound';

function reportFailure(context: string, error: unknown): void {
  logError(context, error);
  playSound('error');
  toast.error(message(getErrorMessageKey(error)));
}

/**
 * Runs an action that returns a value; resolves to `undefined` (after a
 * localized error toast) if it fails. Use `attempt()` for void actions.
 */
export async function runAction<T extends object>(context: string, action: () => Promise<T>): Promise<T | undefined> {
  try {
    return await action();
  } catch (error) {
    reportFailure(context, error);
    return undefined;
  }
}

/** Runs a void action; resolves to true on success, false (with toast) on failure. */
export async function attempt(context: string, action: () => Promise<unknown>): Promise<boolean> {
  try {
    await action();
    return true;
  } catch (error) {
    reportFailure(context, error);
    return false;
  }
}
