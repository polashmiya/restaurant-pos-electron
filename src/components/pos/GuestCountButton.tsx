import { UsersRound } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useFormatters } from '@/hooks/useFormatters';
import { usePosStore } from '@/store/posStore';
import { useUIStore } from '@/store/uiStore';
import { cn } from '@/utils/cn';

/** Dine-in: number of guests at the table; opens the guest count dialog. */
export function GuestCountButton() {
  const { t } = useTranslation();
  const format = useFormatters();
  const guests = usePosStore((state) => state.draft.guests);
  const openModal = useUIStore((state) => state.openModal);

  return (
    <button
      type="button"
      onClick={() => openModal({ type: 'guestCount' })}
      aria-label={guests ? t('guests.change', { count: guests }) : t('guests.set')}
      className={cn(
        'flex min-h-touch shrink-0 flex-col items-center justify-center rounded-control border px-3 leading-tight transition-colors',
        guests
          ? 'border-border bg-surface-2 hover:bg-surface-3'
          : 'border-dashed border-border-strong text-fg-muted hover:bg-surface-2 hover:text-fg',
      )}
    >
      <span className="inline-flex items-center gap-1.5 font-bold tabular-nums">
        <UsersRound className="size-4 text-primary-text" aria-hidden />
        {guests ? format.number(guests) : '–'}
      </span>
      <span className="text-xs text-fg-muted">{t('guests.label')}</span>
    </button>
  );
}
