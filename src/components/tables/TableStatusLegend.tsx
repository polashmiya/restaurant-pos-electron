import { useTranslation } from 'react-i18next';
import { useFormatters } from '@/hooks/useFormatters';
import { useTableCounts } from '@/store/tableStore';
import { cn } from '@/utils/cn';
import { TABLE_STATUS_VISUALS, TABLE_STATUSES } from './tableVisuals';

/** Status legend with live counts (icon + text + color). */
export function TableStatusLegend({ className }: { className?: string }) {
  const { t } = useTranslation();
  const format = useFormatters();
  const counts = useTableCounts();

  return (
    <ul aria-label={t('tables.legend')} className={cn('flex flex-wrap gap-2', className)}>
      {TABLE_STATUSES.map((status) => {
        const visual = TABLE_STATUS_VISUALS[status];
        const Icon = visual.icon;
        return (
          <li
            key={status}
            className={cn(
              'inline-flex min-h-10 items-center gap-2 rounded-full border px-3 text-sm font-semibold',
              visual.card,
              visual.text,
            )}
          >
            <Icon className="size-4" aria-hidden />
            <span className="text-fg">{t(`tableStatus.${status}`)}</span>
            <span className="tabular-nums">{format.number(counts[status])}</span>
          </li>
        );
      })}
    </ul>
  );
}
