import { Archive } from 'lucide-react';
import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Card, CardHeader } from '@/components/common/Card';
import { EmptyState } from '@/components/common/EmptyState';
import { useFormatters } from '@/hooks/useFormatters';
import { useShiftStore } from '@/store/shiftStore';
import { useUIStore } from '@/store/uiStore';
import { cn } from '@/utils/cn';
import { toMinor } from '@/utils/money';
import { calculateCashDifference } from '@/utils/shiftMath';

/** Closed shifts, newest first; tap to view/print the report. */
export function ShiftHistory() {
  const { t } = useTranslation();
  const format = useFormatters();
  const shifts = useShiftStore((state) => state.shifts);
  const openModal = useUIStore((state) => state.openModal);
  const closed = useMemo(
    () => shifts.filter((shift) => shift.status === 'closed').sort((a, b) => b.openedAt.localeCompare(a.openedAt)),
    [shifts],
  );

  return (
    <Card>
      <CardHeader title={t('shift.history')} icon={<Archive className="size-5" aria-hidden />} />
      {closed.length === 0 ? (
        <EmptyState compact icon={<Archive aria-hidden />} title={t('shift.noHistory')} />
      ) : (
        <div className="overflow-x-auto">
          {/* Phones and small tablets: one row per shift as a card. */}
          <ul aria-label={t('shift.history')} className="divide-y divide-border lg:hidden">
            {closed.map((shift) => {
              const difference = shift.closingCash !== undefined ? calculateCashDifference(shift, shift.closingCash) : 0;
              return (
                <li key={shift.id}>
                  <button
                    type="button"
                    onClick={() => openModal({ type: 'shiftReport', shiftId: shift.id })}
                    className="flex w-full flex-col gap-1 py-3 text-start transition-colors hover:bg-surface-2"
                  >
                    <span className="flex items-center justify-between gap-3">
                      <span className="truncate font-semibold">{format.dateTime(shift.openedAt)}</span>
                      <span className="font-bold tabular-nums">{format.currency(shift.totalSales)}</span>
                    </span>
                    <span className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-fg-muted">
                      <span>{shift.cashierName}</span>
                      <span aria-hidden>·</span>
                      <span>{t('shift.orderCount')}: {format.number(shift.orderCount)}</span>
                      <span aria-hidden>·</span>
                      <span
                        className={cn(
                          'font-semibold tabular-nums',
                          toMinor(difference) < 0
                            ? 'text-danger-text'
                            : toMinor(difference) > 0
                              ? 'text-info-text'
                              : 'text-success-text',
                        )}
                      >
                        {t('shift.difference')}: {format.currency(difference)}
                      </span>
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
          <table className="hidden w-full min-w-[44rem] text-sm lg:table">
            <thead className="text-xs text-fg-muted uppercase">
              <tr>
                <th scope="col" className="py-2 text-start font-semibold">
                  {t('shift.openedAt')}
                </th>
                <th scope="col" className="py-2 text-start font-semibold">
                  {t('shift.closedAt')}
                </th>
                <th scope="col" className="py-2 text-start font-semibold">
                  {t('shift.cashierName')}
                </th>
                <th scope="col" className="py-2 text-end font-semibold">
                  {t('shift.orderCount')}
                </th>
                <th scope="col" className="py-2 text-end font-semibold">
                  {t('shift.totalRevenue')}
                </th>
                <th scope="col" className="py-2 text-end font-semibold">
                  {t('shift.difference')}
                </th>
              </tr>
            </thead>
            <tbody>
              {closed.map((shift) => {
                const difference = shift.closingCash !== undefined ? calculateCashDifference(shift, shift.closingCash) : 0;
                return (
                  <tr
                    key={shift.id}
                    className="cursor-pointer border-t border-border hover:bg-surface-2"
                    onClick={() => openModal({ type: 'shiftReport', shiftId: shift.id })}
                  >
                    <td className="py-2.5">
                      <button type="button" className="text-start font-semibold hover:underline">
                        {format.dateTime(shift.openedAt)}
                      </button>
                    </td>
                    <td className="py-2.5">{shift.closedAt ? format.dateTime(shift.closedAt) : '—'}</td>
                    <td className="py-2.5">{shift.cashierName}</td>
                    <td className="py-2.5 text-end tabular-nums">{format.number(shift.orderCount)}</td>
                    <td className="py-2.5 text-end font-bold tabular-nums">{format.currency(shift.totalSales)}</td>
                    <td
                      className={cn(
                        'py-2.5 text-end font-semibold tabular-nums',
                        toMinor(difference) < 0 ? 'text-danger-text' : toMinor(difference) > 0 ? 'text-info-text' : 'text-success-text',
                      )}
                    >
                      {format.currency(difference)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </Card>
  );
}
