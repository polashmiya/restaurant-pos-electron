import { ArrowDownRight, ArrowUpRight, Minus } from 'lucide-react';
import type { ReactNode } from 'react';
import { cn } from '@/utils/cn';

export interface StatDelta {
  /** Percentage change vs the previous period; null when there is nothing to compare. */
  change: number | null;
  /** Whether an increase is good news (sales) or bad news (cancellations). */
  upIsGood: boolean;
  /** "12.5%" */
  valueLabel: string;
  /** Screen-reader sentence ("Up 12.5%"). */
  srLabel: string;
  /** "vs previous 7 days" or a note when there is nothing to compare. */
  caption: string;
}

/**
 * KPI figure: label, value (proportional digits) and a signed change vs the
 * previous period of the same length. Direction is shown by arrow AND color.
 */
export function ReportStatTile({
  label,
  value,
  icon,
  delta,
  footnote,
  emphasis = false,
}: {
  label: string;
  value: string;
  icon: ReactNode;
  delta?: StatDelta;
  footnote?: string;
  emphasis?: boolean;
}) {
  const direction = delta?.change == null || delta.change === 0 ? 'flat' : delta.change > 0 ? 'up' : 'down';
  const good = direction === 'flat' ? null : (direction === 'up') === delta?.upIsGood;
  const ArrowIcon = direction === 'up' ? ArrowUpRight : direction === 'down' ? ArrowDownRight : Minus;

  return (
    <div
      className={cn(
        'flex min-w-0 flex-col gap-2 rounded-card border p-3 sm:p-4',
        emphasis ? 'border-primary/40 bg-primary/10' : 'border-border bg-surface',
      )}
    >
      <div className="flex items-center gap-2 text-sm font-semibold text-fg-muted">
        <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-surface-3 text-fg [&>svg]:size-[18px]" aria-hidden>
          {icon}
        </span>
        <span className="truncate">{label}</span>
      </div>
      <p className={cn('leading-tight font-extrabold break-words text-fg', emphasis ? 'text-xl sm:text-3xl' : 'text-lg sm:text-2xl')}>
        {value}
      </p>
      {delta && (
        <p className="flex flex-wrap items-center gap-x-1.5 text-xs text-fg-muted">
          {delta.change !== null && (
            <span
              className={cn(
                'inline-flex items-center gap-0.5 font-bold',
                good === true && 'text-success-text',
                good === false && 'text-danger-text',
                good === null && 'text-fg-muted',
              )}
            >
              <ArrowIcon className="size-3.5" aria-hidden />
              <span aria-hidden>{delta.valueLabel}</span>
              <span className="sr-only">{delta.srLabel}</span>
            </span>
          )}
          <span>{delta.caption}</span>
        </p>
      )}
      {footnote && <p className="text-xs text-fg-muted">{footnote}</p>}
    </div>
  );
}
