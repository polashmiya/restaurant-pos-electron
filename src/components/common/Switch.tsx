import { useId, type ReactNode } from 'react';
import { cn } from '@/utils/cn';

export interface SwitchProps {
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  label: ReactNode;
  description?: ReactNode;
  disabled?: boolean;
  className?: string;
}

/** Accessible on/off toggle (role="switch") with a large touch target. */
export function Switch({ checked, onCheckedChange, label, description, disabled, className }: SwitchProps) {
  const id = useId();
  return (
    <div className={cn('flex min-h-touch items-center justify-between gap-4', className)}>
      <div className="min-w-0">
        <label htmlFor={id} className="font-medium text-fg">
          {label}
        </label>
        {description && (
          <p id={`${id}-description`} className="text-sm text-fg-muted">
            {description}
          </p>
        )}
      </div>
      <button
        id={id}
        type="button"
        role="switch"
        aria-checked={checked}
        aria-describedby={description ? `${id}-description` : undefined}
        disabled={disabled}
        onClick={() => onCheckedChange(!checked)}
        className={cn(
          'relative inline-flex h-8 w-14 shrink-0 items-center rounded-full border transition-colors duration-150',
          'disabled:opacity-50',
          checked ? 'border-primary bg-primary' : 'border-border-strong bg-surface-3',
        )}
      >
        <span
          aria-hidden
          className={cn(
            'inline-block size-6 rounded-full bg-white shadow transition-transform duration-150',
            checked ? 'translate-x-7 rtl:-translate-x-7' : 'translate-x-1 rtl:-translate-x-1',
          )}
        />
      </button>
    </div>
  );
}
