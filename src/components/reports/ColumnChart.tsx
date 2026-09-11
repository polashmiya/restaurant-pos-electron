import { useId, useMemo, useState, type KeyboardEvent } from 'react';
import { useElementWidth } from '@/hooks/useElementWidth';
import { cn } from '@/utils/cn';
import { niceScale } from '@/utils/reports';

export interface ColumnDatum {
  key: string;
  /** Short axis label ("10 Sep", "13"). */
  axisLabel: string;
  /** Tooltip heading ("Thursday, 10 September 2026"). */
  title: string;
  value: number;
  /** Secondary tooltip line ("12 orders"). */
  detail?: string;
}

interface ColumnChartProps {
  data: readonly ColumnDatum[];
  /** Accessible name (chart title + keyboard hint). */
  label: string;
  /** Tooltip value and the peak label ("৳ 12,340"). */
  formatValue: (value: number) => string;
  /** Axis ticks ("12,000"). */
  formatTick: (value: number) => string;
  /** Counts: whole-number ticks only. */
  integer?: boolean;
  plotHeight?: number;
}

/* Mark specs: bars ≤24px with a 4px rounded data end and a square base,
   hairline solid gridlines, one series hue, text in text tokens. */
const BAR_MAX_WIDTH = 24;
const TOP_PADDING = 24;
const AXIS_GAP = 8;
const X_AXIS_HEIGHT = 26;
const FONT_SIZE = 11;
const CHAR_WIDTH = 6.8;

function roundedTopBar(x: number, y: number, width: number, height: number): string {
  const r = Math.min(4, width / 2, height);
  return `M${x},${y + height}V${y + r}Q${x},${y} ${x + r},${y}H${x + width - r}Q${x + width},${y} ${x + width},${y + r}V${y + height}Z`;
}

/**
 * Single-series column chart in plain SVG. Each column's band is its hover
 * target; the keyboard moves through columns (← →, Home, End) and every value
 * is announced, so the tooltip never gates information.
 */
export function ColumnChart({ data, label, formatValue, formatTick, integer = false, plotHeight = 200 }: ColumnChartProps) {
  const [containerRef, width] = useElementWidth<HTMLDivElement>();
  const [active, setActive] = useState<number | null>(null);
  const liveId = useId();

  const max = data.reduce((highest, datum) => Math.max(highest, datum.value), 0);
  const scale = useMemo(() => niceScale(max, { integer }), [max, integer]);
  const tickLabels = scale.ticks.map(formatTick);
  const plotLeft = Math.max(...tickLabels.map((text) => text.length), 1) * CHAR_WIDTH + AXIS_GAP + 2;
  const plotRight = width - 2;
  const plotWidth = Math.max(10, plotRight - plotLeft);
  const band = plotWidth / Math.max(1, data.length);
  const barWidth = Math.max(2, Math.min(BAR_MAX_WIDTH, band * 0.64));
  const baseline = TOP_PADDING + plotHeight;
  const height = baseline + X_AXIS_HEIGHT;
  const yFor = (value: number) => TOP_PADDING + plotHeight * (1 - value / scale.max);
  const longestAxisLabel = data.reduce((longest, datum) => Math.max(longest, datum.axisLabel.length), 1);
  const labelEvery = Math.max(1, Math.ceil((longestAxisLabel * CHAR_WIDTH + 10) / band));
  const peakIndex = max > 0 ? data.findIndex((datum) => datum.value === max) : -1;
  const centerOf = (index: number) => plotLeft + band * index + band / 2;

  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (data.length === 0) return;
    const current = active ?? Math.max(0, peakIndex);
    const next =
      event.key === 'ArrowRight' || event.key === 'ArrowUp'
        ? Math.min(data.length - 1, current + 1)
        : event.key === 'ArrowLeft' || event.key === 'ArrowDown'
          ? Math.max(0, current - 1)
          : event.key === 'Home'
            ? 0
            : event.key === 'End'
              ? data.length - 1
              : null;
    if (next === null) return;
    event.preventDefault();
    setActive(next);
  };

  const activeDatum = active === null ? undefined : data[active];
  const tooltipTop = activeDatum ? yFor(activeDatum.value) : 0;
  const tooltipBelow = tooltipTop < 70;
  const tooltipLeft = active === null ? 0 : Math.min(Math.max(centerOf(active), 90), width - 90);

  const peak = peakIndex >= 0 ? data[peakIndex] : undefined;
  const peakText = peak ? formatValue(peak.value) : '';
  const peakHalfWidth = (peakText.length * CHAR_WIDTH) / 2;
  const peakX = Math.min(Math.max(centerOf(peakIndex), plotLeft + peakHalfWidth), plotRight - peakHalfWidth);

  return (
    <div ref={containerRef} className="relative w-full">
      <div
        role="group"
        tabIndex={0}
        aria-label={label}
        aria-describedby={liveId}
        onKeyDown={onKeyDown}
        onFocus={() => setActive((current) => current ?? Math.max(0, peakIndex))}
        onBlur={() => setActive(null)}
        className="rounded-control"
      >
        <svg width={width} height={height} className="block overflow-visible" onPointerLeave={() => setActive(null)} aria-hidden>
          {scale.ticks.map((tick, index) => {
            const y = Math.round(yFor(tick)) + 0.5;
            return (
              <g key={tick}>
                <line x1={plotLeft} x2={plotRight} y1={y} y2={y} stroke="var(--c-chart-grid)" strokeWidth={1} shapeRendering="crispEdges" />
                <text x={plotLeft - AXIS_GAP} y={y} dy="0.32em" textAnchor="end" fontSize={FONT_SIZE} className="fill-fg-muted tabular-nums">
                  {tickLabels[index]}
                </text>
              </g>
            );
          })}

          {data.map((datum, index) => {
            if (datum.value <= 0) return null;
            const y = yFor(datum.value);
            return (
              <path
                key={datum.key}
                d={roundedTopBar(plotLeft + band * index + (band - barWidth) / 2, y, barWidth, baseline - y)}
                fill={index === active ? 'var(--c-chart-1-hover)' : 'var(--c-chart-1)'}
              />
            );
          })}

          {data.map((datum, index) =>
            index % labelEvery === 0 ? (
              <text
                key={`x-${datum.key}`}
                x={centerOf(index)}
                y={baseline + 17}
                textAnchor="middle"
                fontSize={FONT_SIZE}
                className={cn('fill-fg-muted', index === active && 'fill-fg')}
              >
                {datum.axisLabel}
              </text>
            ) : null,
          )}

          {peak && active === null && (
            <text x={peakX} y={yFor(peak.value) - 7} textAnchor="middle" fontSize={FONT_SIZE} fontWeight={600} className="fill-fg">
              {peakText}
            </text>
          )}

          {data.map((datum, index) => (
            <rect
              key={`hit-${datum.key}`}
              x={plotLeft + band * index}
              y={TOP_PADDING - 10}
              width={band}
              height={plotHeight + 10}
              fill="transparent"
              onPointerEnter={() => setActive(index)}
            />
          ))}
        </svg>
      </div>

      {activeDatum && (
        <div
          className="pointer-events-none absolute z-10 min-w-28 max-w-60 rounded-lg border border-border bg-surface-3 px-3 py-2 shadow-lg"
          style={{
            left: tooltipLeft,
            top: tooltipBelow ? tooltipTop + 12 : tooltipTop - 10,
            transform: tooltipBelow ? 'translateX(-50%)' : 'translate(-50%, -100%)',
          }}
        >
          <p className="text-base font-bold whitespace-nowrap text-fg">{formatValue(activeDatum.value)}</p>
          <p className="text-xs text-fg-muted">{activeDatum.title}</p>
          {activeDatum.detail && <p className="text-xs text-fg-muted">{activeDatum.detail}</p>}
        </div>
      )}

      <p id={liveId} className="sr-only" aria-live="polite">
        {activeDatum
          ? [activeDatum.title, formatValue(activeDatum.value), activeDatum.detail].filter(Boolean).join(', ')
          : ''}
      </p>
    </div>
  );
}
