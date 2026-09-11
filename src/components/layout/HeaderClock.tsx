import { useTranslation } from 'react-i18next';
import { useClock } from '@/hooks/useClock';
import { useFormatters } from '@/hooks/useFormatters';

export function HeaderClock() {
  const { t } = useTranslation();
  const now = useClock();
  const format = useFormatters();
  return (
    <div
      className="hidden flex-col items-end leading-tight xl:flex"
      role="timer"
      aria-live="off"
      aria-label={t('header.currentDateTime')}
    >
      <time dateTime={now.toISOString()} className="text-base font-semibold tabular-nums">
        {format.time(now)}
      </time>
      <span className="text-xs text-fg-muted">{format.longDate(now)}</span>
    </div>
  );
}
