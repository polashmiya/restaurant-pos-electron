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
          <table className="w-full min-w-[44rem] text-sm">
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
