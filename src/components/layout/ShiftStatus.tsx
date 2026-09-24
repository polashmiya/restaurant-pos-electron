import { CircleDot, LogIn, UserRound } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/common/Button';
import { IconButton } from '@/components/common/IconButton';
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
      <>
        <span className="hidden sm:block">
          <Button
            variant="outline"
            size="sm"
            icon={<LogIn className="size-4" aria-hidden />}
            onClick={() => openModal({ type: 'openShift' })}
            className="border-warning/60 text-warning-text"
          >
            {t('header.openShift')}
          </Button>
        </span>
        {/* Phones: the same action as an icon-only button. */}
        <span className="sm:hidden">
          <IconButton
            label={t('header.openShift')}
            icon={<LogIn className="size-5" aria-hidden />}
            variant="outline"
            size="sm"
            onClick={() => openModal({ type: 'openShift' })}
            className="border-warning/60 text-warning-text"
            showTooltip={false}
          />
        </span>
      </>
    );
  }

  return (
    <button
      type="button"
      onClick={() => navigate('shift')}
      aria-label={`${t('header.shiftOpen')} — ${t('header.since', { time: format.time(shift.openedAt) })} — ${t('header.cashier')}: ${shift.cashierName}`}
      className="flex min-h-10 shrink-0 items-center gap-3 rounded-control border border-border px-2 text-start hover:bg-surface-2 sm:px-3"
    >
      {/* Phones: the green dot alone says "a shift is open"; the details are
          on the Shift page this button opens. */}
      <CircleDot className="size-5 text-success-text sm:hidden" aria-hidden />
      <span className="hidden flex-col leading-tight sm:flex">
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
