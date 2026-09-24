import { useId } from 'react';
import { useTranslation } from 'react-i18next';
import { SegmentedControl } from '@/components/common/SegmentedControl';
import { useReportStore } from '@/store/reportStore';
import type { ReportRangePreset } from '@/types';
import { cn } from '@/utils/cn';
import { formatIsoDay } from '@/utils/format';

const PRESETS: readonly ReportRangePreset[] = ['today', 'yesterday', 'last7', 'last30', 'thisMonth', 'lastMonth', 'custom'];

/** Date range presets (one row, above everything they scope) plus a custom from/to. */
export function ReportFilters() {
  const { t } = useTranslation();
  const preset = useReportStore((state) => state.preset);
  const custom = useReportStore((state) => state.custom);
  const setPreset = useReportStore((state) => state.setPreset);
  const setCustom = useReportStore((state) => state.setCustom);
  const fromId = useId();
  const toId = useId();
  const today = formatIsoDay(new Date());
  const dateClass = cn(
    'min-h-10 w-full min-w-0 rounded-control border border-border bg-surface-2 px-3 text-sm text-fg sm:w-44',
    'transition-colors duration-150 hover:border-border-strong',
    'focus:border-primary focus:outline-2 focus:outline-offset-0 focus:outline-primary/40',
  );

  return (
    // `basis` is the width the presets want: while it fits beside whatever
    // follows (the sample-data badge) they share a row, otherwise that wraps.
    <div className="flex min-w-0 grow basis-[34rem] flex-wrap items-center gap-3">
      {/* Seven presets do not fit on a phone — they scroll sideways instead. */}
      <div className="scrollbar-none -mx-1 flex max-w-full overflow-x-auto px-1 py-1">
        <SegmentedControl<ReportRangePreset>
          label={t('reports.dateRange')}
          size="sm"
          value={preset}
          onValueChange={setPreset}
          options={PRESETS.map((value) => ({ value, label: t(`reports.range.${value}`) }))}
          className="shrink-0"
        />
      </div>
      {preset === 'custom' && (
        <div className="grid w-full grid-cols-[auto_minmax(0,1fr)] items-center gap-2 sm:flex sm:w-auto sm:flex-wrap">
          <label htmlFor={fromId} className="text-sm font-semibold text-fg-muted">
            {t('reports.from')}
          </label>
          <input
            id={fromId}
            type="date"
            value={custom.from}
            max={custom.to || today}
            onChange={(event) => setCustom({ ...custom, from: event.target.value })}
            className={dateClass}
          />
          <label htmlFor={toId} className="text-sm font-semibold text-fg-muted">
            {t('reports.to')}
          </label>
          <input
            id={toId}
            type="date"
            value={custom.to}
            min={custom.from || undefined}
            max={today}
            onChange={(event) => setCustom({ ...custom, to: event.target.value })}
            className={dateClass}
          />
        </div>
      )}
    </div>
  );
}
