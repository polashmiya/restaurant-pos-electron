import { LayoutGrid } from 'lucide-react';
import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { useFormatters } from '@/hooks/useFormatters';
import { useTableCounts, useTableStore } from '@/store/tableStore';
import type { TableStatus } from '@/types';
import { cn } from '@/utils/cn';
import { TABLE_STATUS_VISUALS, TABLE_STATUSES } from './tableVisuals';

export type TableFilter = 'all' | TableStatus;

/** Status filter chips with live counts (doubles as the color legend). */
export function TableStatusFilter({ value, onChange }: { value: TableFilter; onChange: (filter: TableFilter) => void }) {
  const { t } = useTranslation();
  const format = useFormatters();
  const counts = useTableCounts();
  const total = useTableStore((state) => state.tables.length);

  const chip = (filter: TableFilter, label: string, count: number, icon: ReactNode, colorClass: string) => (
    <button
      key={filter}
      type="button"
      aria-pressed={value === filter}
      onClick={() => onChange(filter)}
      className={cn(
        'inline-flex min-h-touch shrink-0 items-center gap-2 rounded-full border-2 px-3 text-sm font-semibold transition-colors sm:px-4',
        value === filter ? 'border-primary bg-primary/15' : 'border-border bg-surface hover:bg-surface-2',
      )}
    >
      <span className={colorClass}>{icon}</span>
      <span>{label}</span>
      <span className="rounded-full bg-surface-3 px-2 py-0.5 text-xs tabular-nums">{format.number(count)}</span>
    </button>
  );

  return (
    // Phones scroll the chips sideways instead of stacking them into rows that
    // would eat the height the floor plan needs.
    <div
      role="group"
      aria-label={t('tables.legend')}
      className={cn(
        'scrollbar-none -mx-4 flex gap-2 overflow-x-auto px-4 pb-0.5',
        'sm:mx-0 sm:flex-wrap sm:overflow-visible sm:px-0 sm:pb-0',
      )}
    >
      {chip('all', t('tables.filterAll'), total, <LayoutGrid className="size-4" aria-hidden />, 'text-fg-muted')}
      {TABLE_STATUSES.map((status) => {
        const visual = TABLE_STATUS_VISUALS[status];
        const Icon = visual.icon;
        return chip(status, t(`tableStatus.${status}`), counts[status], <Icon className="size-4" aria-hidden />, visual.text);
      })}
    </div>
  );
}
