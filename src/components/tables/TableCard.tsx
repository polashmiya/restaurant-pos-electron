import { CalendarClock, Timer, Users } from 'lucide-react';
import { memo } from 'react';
import { useTranslation } from 'react-i18next';
import type { Formatters } from '@/hooks/useFormatters';
import type { DiningTable, Order, TableView } from '@/types';
import { cn } from '@/utils/cn';
import { splitDuration } from '@/utils/format';
import { TableIllustration } from './TableIllustration';
import { TABLE_STATUS_VISUALS } from './tableVisuals';

export interface TableCardProps {
  table: DiningTable;
  /** The table's active order (occupied / waiting). */
  order?: Pick<Order, 'total' | 'items' | 'guests'>;
  format: Formatters;
  onSelect: (table: DiningTable) => void;
  /** Highlights the table of the order currently on the POS. */
  isCurrent?: boolean;
  compact?: boolean;
  /** Draws the table with its chairs and guests (Tables page). */
  view?: TableView;
  /** Current time, for "occupied for …". */
  now?: Date;
}

export const TableCard = memo(function TableCard({
  table,
  order,
  format,
  onSelect,
  isCurrent = false,
  compact = false,
  view,
  now,
}: TableCardProps) {
  const { t } = useTranslation();
  const visual = TABLE_STATUS_VISUALS[table.status];
  const StatusIcon = visual.icon;
  const busy = table.status === 'occupied' || table.status === 'waiting';
  const guests = busy ? order?.guests : table.status === 'reserved' ? table.reservation?.guests : undefined;
  const tableLabel = t('tables.tableName', { name: format.digits(table.name) });
  const statusLabel = t(`tableStatus.${table.status}`);
  const guestsLabel = guests ? ` — ${t('tables.guestsCount', { count: guests })}` : '';

  const elapsed = (() => {
    if (!busy || !now || !table.statusSince) return null;
    const { hours, minutes } = splitDuration(Math.max(0, now.getTime() - new Date(table.statusSince).getTime()));
    return hours > 0 ? t('shift.durationValue', { hours, minutes }) : t('tables.minutes', { count: minutes });
  })();

  return (
    <button
      type="button"
      onClick={() => onSelect(table)}
      aria-label={`${tableLabel} — ${statusLabel}${guestsLabel}`}
      aria-current={isCurrent ? 'true' : undefined}
      className={cn(
        'relative flex w-full flex-col rounded-card border-2 text-start transition-colors duration-150',
        compact ? 'min-h-24 gap-1 p-3' : 'min-h-36 gap-2 p-3',
        visual.card,
        isCurrent && 'ring-2 ring-primary ring-offset-2 ring-offset-surface',
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <span className={cn('leading-none font-extrabold tabular-nums', compact ? 'text-2xl' : 'text-3xl')}>
          {format.digits(table.name)}
        </span>
        <span className="inline-flex items-center gap-1 text-sm text-fg-muted tabular-nums">
          <Users className="size-4" aria-hidden />
          {guests ? `${format.number(guests)}/${format.number(table.capacity)}` : format.number(table.capacity)}
        </span>
      </div>

      {view && !compact && (
        <TableIllustration
          capacity={table.capacity}
          guests={guests}
          status={table.status}
          view={view}
          seed={table.number}
          className="h-[calc(8.5rem*var(--app-card-scale))] w-full"
        />
      )}

      <span className={cn('inline-flex items-center gap-1.5 text-sm font-semibold', visual.text)}>
        <StatusIcon className="size-4 shrink-0" aria-hidden />
        {statusLabel}
      </span>

      {!compact && (
        <div className="mt-auto min-h-10 space-y-0.5 pe-9 text-sm">
          {order && busy && (
            <>
              <p className="font-bold text-fg tabular-nums">{format.currency(order.total)}</p>
              <p className="flex flex-wrap items-center gap-x-1 text-fg-muted">
                {t('common.itemCount', { count: order.items.reduce((sum, item) => sum + item.quantity, 0) })}
                {elapsed && (
                  <span className="inline-flex items-center gap-1">
                    · <Timer className="size-3.5 shrink-0" aria-hidden />
                    {elapsed}
                  </span>
                )}
              </p>
            </>
          )}
          {table.reservation && table.status === 'reserved' && (
            <p className="flex items-center gap-1.5 text-fg-muted">
              <CalendarClock className="size-4 shrink-0" aria-hidden />
              <span className="truncate">
                {table.reservation.guestName} · {format.digits(table.reservation.time)}
              </span>
            </p>
          )}
        </div>
      )}
    </button>
  );
});
