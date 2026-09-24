import type { ReactNode } from 'react';
import { cn } from '@/utils/cn';

export function StatCard({
  label,
  value,
  icon,
  emphasis = false,
  tone = 'default',
}: {
  label: string;
  value: string;
  icon: ReactNode;
  emphasis?: boolean;
  tone?: 'default' | 'success' | 'warning';
}) {
  return (
    <div
      className={cn(
        'flex min-w-0 flex-col gap-3 rounded-card border p-3 sm:p-5',
        emphasis ? 'border-primary/40 bg-primary/10' : 'border-border bg-surface',
      )}
    >
      <div className="flex items-center gap-2 text-sm font-semibold text-fg-muted">
        <span
          className={cn(
            'grid size-9 shrink-0 place-items-center rounded-lg [&>svg]:size-5',
            tone === 'success' ? 'bg-success/15 text-success-text' : tone === 'warning' ? 'bg-warning/15 text-warning-text' : 'bg-surface-3 text-fg',
          )}
          aria-hidden
        >
          {icon}
        </span>
        <span className="min-w-0">{label}</span>
      </div>
      <p className={cn('font-extrabold break-words tabular-nums', emphasis ? 'text-xl sm:text-4xl' : 'text-lg sm:text-2xl')}>
        {value}
      </p>
    </div>
  );
}
