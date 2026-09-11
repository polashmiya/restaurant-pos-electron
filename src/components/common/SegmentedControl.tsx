import type { ReactNode } from 'react';
import { cn } from '@/utils/cn';

export interface SegmentOption<T extends string> {
  value: T;
  label: ReactNode;
  icon?: ReactNode;
  /** Accessible name when the label is not plain text. */
  ariaLabel?: string;
  disabled?: boolean;
}

export interface SegmentedControlProps<T extends string> {
  value: T;
  onValueChange: (value: T) => void;
  options: readonly SegmentOption<T>[];
  /** Accessible name of the group. */
  label: string;
  size?: 'sm' | 'md' | 'lg';
  fullWidth?: boolean;
  className?: string;
}

const SIZE_CLASSES = {
  sm: 'min-h-9 px-3 text-sm',
  md: 'min-h-touch px-4 text-base',
  lg: 'min-h-14 px-5 text-base',
} as const;

/**
 * Radio-group styled as a segmented button bar (order type, language,
 * theme, discount type). Arrow keys move the selection.
 */
export function SegmentedControl<T extends string>({
  value,
  onValueChange,
  options,
  label,
  size = 'md',
  fullWidth = false,
  className,
}: SegmentedControlProps<T>) {
  const enabled = options.filter((option) => !option.disabled);

  const move = (direction: 1 | -1) => {
    const index = enabled.findIndex((option) => option.value === value);
    const next = enabled[(index + direction + enabled.length) % enabled.length];
    if (next) onValueChange(next.value);
  };

  return (
    <div
      role="radiogroup"
      aria-label={label}
      className={cn(
        'inline-flex gap-1 rounded-control border border-border bg-surface-2 p-1',
        fullWidth && 'flex w-full',
        className,
      )}
      onKeyDown={(event) => {
        if (event.key === 'ArrowRight' || event.key === 'ArrowDown') {
          event.preventDefault();
          move(document.documentElement.dir === 'rtl' && event.key === 'ArrowRight' ? -1 : 1);
        } else if (event.key === 'ArrowLeft' || event.key === 'ArrowUp') {
          event.preventDefault();
          move(document.documentElement.dir === 'rtl' && event.key === 'ArrowLeft' ? 1 : -1);
        }
      }}
    >
      {options.map((option) => {
        const selected = option.value === value;
        return (
          <button
            key={option.value}
            type="button"
            role="radio"
            aria-checked={selected}
            aria-label={option.ariaLabel}
            tabIndex={selected ? 0 : -1}
            disabled={option.disabled}
            onClick={() => onValueChange(option.value)}
            className={cn(
              'inline-flex items-center justify-center gap-2 rounded-[calc(var(--app-radius-control)-4px)] font-semibold',
              'transition-colors duration-150 disabled:opacity-40',
              SIZE_CLASSES[size],
              fullWidth && 'flex-1',
              selected ? 'bg-primary text-primary-fg shadow-sm' : 'text-fg-muted hover:bg-surface-3 hover:text-fg',
            )}
          >
            {option.icon}
            {option.label}
          </button>
        );
      })}
    </div>
  );
}
