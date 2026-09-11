import type { ReactNode } from 'react';
import { cn } from '@/utils/cn';
import { Kbd } from './Kbd';

export interface TooltipProps {
  label: string;
  shortcut?: string;
  side?: 'top' | 'bottom' | 'bottom-end' | 'end';
  children: ReactNode;
  className?: string;
}

const SIDE_CLASSES = {
  top: 'bottom-full mb-2 start-1/2 -translate-x-1/2 rtl:translate-x-1/2',
  bottom: 'top-full mt-2 start-1/2 -translate-x-1/2 rtl:translate-x-1/2',
  'bottom-end': 'top-full mt-2 end-0',
  end: 'start-full ms-2 top-1/2 -translate-y-1/2',
} as const;

/**
 * Lightweight CSS tooltip shown on hover and keyboard focus. The label is
 * decorative (aria-hidden) — the wrapped control carries its own name.
 */
export function Tooltip({ label, shortcut, side = 'bottom', children, className }: TooltipProps) {
  return (
    <span className={cn('group/tooltip relative inline-flex', className)}>
      {children}
      <span
        aria-hidden
        className={cn(
          'pointer-events-none absolute z-50 flex items-center gap-2 rounded-lg border border-border bg-surface-3 px-2.5 py-1.5',
          'text-xs font-medium whitespace-nowrap text-fg opacity-0 shadow-lg transition-opacity duration-150',
          'group-hover/tooltip:opacity-100 group-has-[:focus-visible]/tooltip:opacity-100',
          SIDE_CLASSES[side],
        )}
      >
        {label}
        {shortcut && <Kbd>{shortcut}</Kbd>}
      </span>
    </span>
  );
}
