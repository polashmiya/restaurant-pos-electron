import type { ReactNode } from 'react';
import { cn } from '@/utils/cn';

export interface FieldProps {
  label?: ReactNode;
  htmlFor?: string;
  hint?: ReactNode;
  error?: ReactNode;
  required?: boolean;
  className?: string;
  children: ReactNode;
}

/** Label + control + hint/error, with ids wired by the caller. */
export function Field({ label, htmlFor, hint, error, required, className, children }: FieldProps) {
  return (
    <div className={cn('flex flex-col gap-1.5', className)}>
      {label && (
        <label htmlFor={htmlFor} className="text-sm font-semibold text-fg">
          {label}
          {required && (
            <span aria-hidden className="ms-1 text-danger-text">
              *
            </span>
          )}
        </label>
      )}
      {children}
      {error ? (
        <p id={htmlFor ? `${htmlFor}-error` : undefined} role="alert" className="text-sm font-medium text-danger-text">
          {error}
        </p>
      ) : (
        hint && (
          <p id={htmlFor ? `${htmlFor}-hint` : undefined} className="text-sm text-fg-muted">
            {hint}
          </p>
        )
      )}
    </div>
  );
}
