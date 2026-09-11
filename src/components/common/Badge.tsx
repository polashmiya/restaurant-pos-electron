import type { ReactNode } from 'react';
import { cn } from '@/utils/cn';

export type BadgeTone =
  | 'neutral'
  | 'primary'
  | 'success'
  | 'danger'
  | 'warning'
  | 'info'
  | 'available'
  | 'occupied'
  | 'reserved'
  | 'waiting';

const TONE_CLASSES: Record<BadgeTone, string> = {
  neutral: 'bg-surface-3 text-fg-muted',
  primary: 'bg-primary/15 text-primary-text',
  success: 'bg-success/15 text-success-text',
  danger: 'bg-danger/15 text-danger-text',
  warning: 'bg-warning/15 text-warning-text',
  info: 'bg-info/15 text-info-text',
  available: 'bg-status-available/15 text-status-available',
  occupied: 'bg-status-occupied/15 text-status-occupied',
  reserved: 'bg-status-reserved/15 text-status-reserved',
  waiting: 'bg-status-waiting/15 text-status-waiting',
};

export interface BadgeProps {
  tone?: BadgeTone;
  icon?: ReactNode;
  children: ReactNode;
  size?: 'sm' | 'md';
  className?: string;
}

export function Badge({ tone = 'neutral', icon, children, size = 'sm', className }: BadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full font-semibold whitespace-nowrap',
        size === 'sm' ? 'px-2.5 py-0.5 text-xs' : 'px-3 py-1 text-sm',
        TONE_CLASSES[tone],
        className,
      )}
    >
      {icon}
      {children}
    </span>
  );
}
