import type { TranslationKey } from '@/i18n/keys';

export type AppErrorCode = 'storage' | 'validation' | 'print' | 'not-found' | 'conflict' | 'unknown';

/**
 * Error with a stable code and a translation key for the cashier-facing
 * message. Raw technical messages are logged, never shown in the UI.
 */
export class AppError extends Error {
  readonly code: AppErrorCode;
  readonly messageKey: TranslationKey;
  readonly params?: Record<string, string | number>;

  constructor(
    code: AppErrorCode,
    messageKey: TranslationKey,
    options: { cause?: unknown; params?: Record<string, string | number>; detail?: string } = {},
  ) {
    super(options.detail ?? messageKey, { cause: options.cause });
    this.name = 'AppError';
    this.code = code;
    this.messageKey = messageKey;
    this.params = options.params;
  }
}

export function isAppError(error: unknown): error is AppError {
  return error instanceof AppError;
}

/** Translation key to show for any error, with a safe fallback. */
export function getErrorMessageKey(error: unknown, fallback: TranslationKey = 'errors.unexpected'): TranslationKey {
  return isAppError(error) ? error.messageKey : fallback;
}

export function logError(context: string, error: unknown): void {
  console.error(`[${context}]`, error);
}
