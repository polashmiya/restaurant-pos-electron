import type { ReactNode } from 'react';

export interface BarListRow {
  key: string;
  label: string;
  value: number;
  /** Formatted value at the bar tip ("৳ 12,340"). */
  valueLabel: string;
  /** Muted secondary text ("23 orders"). */
  detail?: string;
  icon?: ReactNode;
}

/**
 * Ranked horizontal bars (one hue): label and value on top, the bar with its
 * share of the total below. Every value is a direct label, so nothing hides
 * behind a hover.
 */
export function BarList({
  rows,
  total,
  formatShare,
  label,
}: {
  rows: readonly BarListRow[];
  /** Denominator for the share column. */
  total: number;
  formatShare: (share: number) => string;
  label: string;
}) {
  const max = rows.reduce((highest, row) => Math.max(highest, row.value), 0);
  return (
    <ul className="space-y-3.5" aria-label={label}>
      {rows.map((row) => {
        const share = total > 0 ? row.value / total : 0;
        const width = max > 0 ? Math.max(row.value > 0 ? 1.5 : 0, (row.value / max) * 100) : 0;
        return (
          <li key={row.key} className="group">
            <div className="flex items-baseline justify-between gap-3">
              <span className="flex min-w-0 items-center gap-2">
                {row.icon && (
                  <span className="grid size-6 shrink-0 place-items-center text-fg-muted [&>svg]:size-4" aria-hidden>
                    {row.icon}
                  </span>
                )}
                <span className="truncate font-medium text-fg">{row.label}</span>
                {row.detail && <span className="shrink-0 text-xs text-fg-muted">{row.detail}</span>}
              </span>
              <span className="shrink-0 font-semibold whitespace-nowrap text-fg tabular-nums">{row.valueLabel}</span>
            </div>
            <div className="mt-1.5 flex items-center gap-3">
              <div className="h-2.5 flex-1 rounded-e-[4px] bg-chart-1/12">
                <div
                  className="h-full rounded-e-[4px] bg-chart-1 transition-colors duration-150 group-hover:bg-chart-1-hover"
                  style={{ width: `${width}%` }}
                />
              </div>
              <span className="w-14 shrink-0 text-end text-xs text-fg-muted tabular-nums">{formatShare(share)}</span>
            </div>
          </li>
        );
      })}
    </ul>
  );
}
