import type { ButtonHTMLAttributes, ReactNode, Ref } from 'react';
import { cn } from '@/utils/cn';
import type { ButtonVariant } from './Button';
import { Tooltip, type TooltipProps } from './Tooltip';

const VARIANT_CLASSES: Record<ButtonVariant, string> = {
  primary: 'bg-primary text-primary-fg hover:bg-primary-hover',
  secondary: 'border border-border bg-surface-2 text-fg hover:bg-surface-3',
  ghost: 'text-fg-muted hover:bg-surface-2 hover:text-fg',
  danger: 'bg-danger text-danger-fg hover:bg-danger-hover',
  'danger-soft': 'bg-danger/12 text-danger-text hover:bg-danger/20',
  success: 'bg-success text-success-fg hover:bg-success-hover',
  outline: 'border border-border-strong text-fg hover:bg-surface-2',
};

const SIZE_CLASSES = {
  sm: 'size-10',
  md: 'size-touch',
  lg: 'size-14',
} as const;

const SHAPE_CLASSES = {
  rounded: 'rounded-control',
  circle: 'rounded-full',
} as const;

export interface IconButtonProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'aria-label'> {
  /** Required accessible name (icon-only buttons have no visible text). */
  label: string;
  icon: ReactNode;
  variant?: ButtonVariant;
  size?: keyof typeof SIZE_CLASSES;
  shape?: keyof typeof SHAPE_CLASSES;
  /** Keyboard shortcut shown in the tooltip. */
  shortcut?: string;
  showTooltip?: boolean;
  tooltipSide?: TooltipProps['side'];
  ref?: Ref<HTMLButtonElement>;
}

export function IconButton({
  label,
  icon,
  variant = 'ghost',
  size = 'md',
  shape = 'rounded',
  shortcut,
  showTooltip = true,
  tooltipSide,
  className,
  type = 'button',
  ref,
  ...rest
}: IconButtonProps) {
  const button = (
    <button
      ref={ref}
      type={type}
      aria-label={label}
      className={cn(
        'inline-grid shrink-0 place-items-center transition-colors duration-150 disabled:opacity-40',
        VARIANT_CLASSES[variant],
        SIZE_CLASSES[size],
        SHAPE_CLASSES[shape],
        className,
      )}
      {...rest}
    >
      {icon}
    </button>
  );

  return showTooltip ? (
    <Tooltip label={label} shortcut={shortcut} side={tooltipSide}>
      {button}
    </Tooltip>
  ) : (
    button
  );
}
