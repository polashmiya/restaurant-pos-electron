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
        'flex flex-col gap-3 rounded-card border p-5',
        emphasis ? 'border-primary/40 bg-primary/10' : 'border-border bg-surface',
      )}
    >
      <div className="flex items-center gap-2 text-sm font-semibold text-fg-muted">
        <span
          className={cn(
            'grid size-9 place-items-center rounded-lg [&>svg]:size-5',
            tone === 'success' ? 'bg-success/15 text-success-text' : tone === 'warning' ? 'bg-warning/15 text-warning-text' : 'bg-surface-3 text-fg',
          )}
          aria-hidden
        >
          {icon}
        </span>
        {label}
      </div>
      <p className={cn('font-extrabold tabular-nums', emphasis ? 'text-4xl' : 'text-2xl')}>{value}</p>
    </div>
  );
}
