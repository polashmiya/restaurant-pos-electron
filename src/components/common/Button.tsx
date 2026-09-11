import type { ButtonHTMLAttributes, ReactNode, Ref } from 'react';
import { cn } from '@/utils/cn';
import { LoadingSpinner } from './LoadingSpinner';

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'ghost-danger' | 'danger' | 'danger-soft' | 'success' | 'outline';
export type ButtonSize = 'sm' | 'md' | 'lg' | 'xl';

const VARIANT_CLASSES: Record<ButtonVariant, string> = {
  primary: 'bg-primary text-primary-fg hover:bg-primary-hover',
  secondary: 'border border-border bg-surface-2 text-fg hover:bg-surface-3',
  ghost: 'bg-transparent text-fg-muted hover:bg-surface-2 hover:text-fg',
  'ghost-danger': 'bg-transparent text-fg-muted hover:bg-danger/12 hover:text-danger-text',
  danger: 'bg-danger text-danger-fg hover:bg-danger-hover',
  'danger-soft': 'bg-danger/12 text-danger-text hover:bg-danger/20',
  success: 'bg-success text-success-fg hover:bg-success-hover',
  outline: 'border border-border-strong bg-transparent text-fg hover:bg-surface-2',
};

const SIZE_CLASSES: Record<ButtonSize, string> = {
  sm: 'min-h-10 gap-1.5 px-3 text-sm',
  md: 'min-h-touch gap-2 px-4 text-base',
  lg: 'min-h-14 gap-2.5 px-5 text-lg',
  xl: 'min-h-16 gap-3 px-6 text-xl',
};

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  /** Shows a spinner and disables the button. */
  loading?: boolean;
  icon?: ReactNode;
  iconEnd?: ReactNode;
  fullWidth?: boolean;
  ref?: Ref<HTMLButtonElement>;
}

export function Button({
  variant = 'secondary',
  size = 'md',
  loading = false,
  icon,
  iconEnd,
  fullWidth = false,
  disabled,
  className,
  children,
  type = 'button',
  ref,
  ...rest
}: ButtonProps) {
  return (
    <button
      ref={ref}
      type={type}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      className={cn(
        'inline-flex shrink-0 items-center justify-center rounded-control font-semibold whitespace-nowrap [&>svg]:shrink-0',
        'transition-colors duration-150 disabled:opacity-50',
        VARIANT_CLASSES[variant],
        SIZE_CLASSES[size],
        fullWidth && 'w-full',
        className,
      )}
      {...rest}
    >
      {loading ? <LoadingSpinner size="sm" /> : icon}
      {children}
      {!loading && iconEnd}
    </button>
  );
}
