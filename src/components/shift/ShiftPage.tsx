import { Clock, LogIn, LogOut, Printer, UserRound } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/common/Button';
import { Card } from '@/components/common/Card';
import { EmptyState } from '@/components/common/EmptyState';
import { useClock } from '@/hooks/useClock';
import { useFormatters } from '@/hooks/useFormatters';
import { useCurrentShift } from '@/store/shiftStore';
import { useUIStore } from '@/store/uiStore';
import { splitDuration } from '@/utils/format';
import { ShiftHistory } from './ShiftHistory';
import { ShiftSummary } from './ShiftSummary';

/** Shift management: open, live summary, close, history. */
export function ShiftPage() {
  const { t } = useTranslation();
  const format = useFormatters();
  const shift = useCurrentShift();
  const now = useClock(30_000);
  const openModal = useUIStore((state) => state.openModal);

  const duration = shift ? splitDuration(now.getTime() - new Date(shift.openedAt).getTime()) : null;

  return (
    <div className="flex h-full flex-col">
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-border bg-surface px-6 py-4">
        <div>
          <h1 className="text-2xl font-bold">{t('shift.title')}</h1>
          {shift && duration && (
            <p className="flex flex-wrap items-center gap-x-4 gap-y-1 text-fg-muted">
              <span className="flex items-center gap-1.5">
                <UserRound className="size-4" aria-hidden />
                {shift.cashierName}
              </span>
              <span className="flex items-center gap-1.5">
                <Clock className="size-4" aria-hidden />
                {t('shift.openedAt')}: {format.dateTime(shift.openedAt)}
              </span>
              <span>
                {t('shift.duration')}: {t('shift.durationValue', { hours: duration.hours, minutes: duration.minutes })}
              </span>
            </p>
          )}
        </div>
        {shift ? (
          <div className="flex gap-2">
            <Button
              variant="secondary"
              icon={<Printer className="size-5" aria-hidden />}
              onClick={() => openModal({ type: 'shiftReport', shiftId: shift.id })}
            >
              {t('shift.viewReport')}
            </Button>
            <Button variant="danger" icon={<LogOut className="size-5" aria-hidden />} onClick={() => openModal({ type: 'closeShift' })}>
              {t('shift.close')}
            </Button>
          </div>
        ) : (
          <Button variant="primary" size="lg" icon={<LogIn className="size-5" aria-hidden />} onClick={() => openModal({ type: 'openShift' })}>
            {t('shift.open')}
          </Button>
        )}
      </div>

      <div className="min-h-0 flex-1 space-y-6 overflow-y-auto p-6">
        {shift ? (
          <ShiftSummary shift={shift} />
        ) : (
          <Card>
            <EmptyState
              icon={<Clock aria-hidden />}
              title={t('shift.noOpenShift')}
              description={t('shift.noOpenShiftHint')}
              action={
                <Button variant="primary" size="lg" icon={<LogIn className="size-5" aria-hidden />} onClick={() => openModal({ type: 'openShift' })}>
                  {t('shift.open')}
                </Button>
              }
            />
          </Card>
        )}
        <ShiftHistory />
      </div>
    </div>
  );
}
