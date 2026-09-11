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
    'min-h-10 w-44 rounded-control border border-border bg-surface-2 px-3 text-sm text-fg',
    'transition-colors duration-150 hover:border-border-strong',
    'focus:border-primary focus:outline-2 focus:outline-offset-0 focus:outline-primary/40',
  );

  return (
    <div className="flex flex-wrap items-center gap-3">
      <SegmentedControl<ReportRangePreset>
        label={t('reports.dateRange')}
        size="sm"
        value={preset}
        onValueChange={setPreset}
        options={PRESETS.map((value) => ({ value, label: t(`reports.range.${value}`) }))}
      />
      {preset === 'custom' && (
        <div className="flex flex-wrap items-center gap-2">
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
