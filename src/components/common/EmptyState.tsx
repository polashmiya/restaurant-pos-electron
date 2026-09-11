import type { ReactNode } from 'react';
import { cn } from '@/utils/cn';

export interface EmptyStateProps {
  icon?: ReactNode;
  title: string;
  description?: string;
  action?: ReactNode;
  compact?: boolean;
  className?: string;
}

export function EmptyState({ icon, title, description, action, compact = false, className }: EmptyStateProps) {
  return (
    <div
      role="status"
      className={cn(
        'flex flex-col items-center justify-center text-center',
        compact ? 'gap-2 px-4 py-8' : 'gap-3 px-6 py-16',
        className,
      )}
    >
      {icon && (
        <span
          className={cn(
            'grid place-items-center rounded-full bg-surface-2 text-fg-subtle',
            compact ? 'size-12 [&>svg]:size-6' : 'size-16 [&>svg]:size-8',
          )}
        >
          {icon}
        </span>
      )}
      <p className={cn('font-semibold text-fg', compact ? 'text-base' : 'text-lg')}>{title}</p>
      {description && <p className="max-w-sm text-sm text-fg-muted">{description}</p>}
      {action && <div className="mt-2">{action}</div>}
    </div>
  );
}
