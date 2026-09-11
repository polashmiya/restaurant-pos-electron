import type { ReactNode } from 'react';
import { cn } from '@/utils/cn';

const TONES = {
  default: 'border-border-strong bg-surface-2 text-fg-muted',
  /** On a colored button: takes the button's text color. */
  inherit: 'border-current/40 bg-current/15 text-current',
} as const;

export function Kbd({ children, className, tone = 'default' }: { children: ReactNode; className?: string; tone?: keyof typeof TONES }) {
  return (
    <kbd
      className={cn(
        'inline-flex min-w-6 items-center justify-center rounded-md border px-1.5',
        'font-mono text-[0.7rem] leading-5 font-semibold',
        TONES[tone],
        className,
      )}
    >
      {children}
    </kbd>
  );
}
