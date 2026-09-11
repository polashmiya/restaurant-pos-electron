import type { ReactNode } from 'react';
import { cn } from '@/utils/cn';

export function Kbd({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <kbd
      className={cn(
        'inline-flex min-w-6 items-center justify-center rounded-md border border-border-strong bg-surface-2 px-1.5',
        'font-mono text-[0.7rem] leading-5 font-semibold text-fg-muted',
        className,
      )}
    >
      {children}
    </kbd>
  );
}
