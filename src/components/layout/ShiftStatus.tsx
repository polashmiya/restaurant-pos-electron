import { CircleDot, LogIn, UserRound } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/common/Button';
import { useFormatters } from '@/hooks/useFormatters';
import { useCurrentShift } from '@/store/shiftStore';
import { useUIStore } from '@/store/uiStore';

/** Header: current shift and cashier, or a shortcut to open a shift. */
export function ShiftStatus() {
  const { t } = useTranslation();
  const shift = useCurrentShift();
  const format = useFormatters();
  const navigate = useUIStore((state) => state.navigate);
  const openModal = useUIStore((state) => state.openModal);

  if (!shift) {
    return (
      <Button
        variant="outline"
        size="sm"
        icon={<LogIn className="size-4" aria-hidden />}
        onClick={() => openModal({ type: 'openShift' })}
        className="border-warning/60 text-warning-text"
      >
        {t('header.openShift')}
      </Button>
    );
  }

  return (
    <button
      type="button"
      onClick={() => navigate('shift')}
      className="flex min-h-10 items-center gap-3 rounded-control border border-border px-3 text-start hover:bg-surface-2"
    >
      <span className="flex flex-col leading-tight">
        <span className="flex items-center gap-1.5 text-sm font-semibold text-success-text">
          <CircleDot className="size-3.5" aria-hidden />
          {t('header.shiftOpen')}
        </span>
        <span className="text-xs text-fg-muted">{t('header.since', { time: format.time(shift.openedAt) })}</span>
      </span>
      <span className="hidden h-8 w-px bg-border lg:block" aria-hidden />
      <span className="hidden items-center gap-1.5 text-sm lg:flex">
        <UserRound className="size-4 text-fg-muted" aria-hidden />
        <span className="sr-only">{t('header.cashier')}:</span>
        <span className="max-w-32 truncate font-medium">{shift.cashierName}</span>
      </span>
    </button>
  );
}
