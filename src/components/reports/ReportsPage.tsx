import {
  Ban,
  Banknote,
  Bike,
  ChartColumn,
  CreditCard,
  FileSpreadsheet,
  FlaskConical,
  Percent,
  Printer,
  ReceiptText,
  ShoppingBag,
  Smartphone,
  UserRound,
  UtensilsCrossed,
  Wallet,
  type LucideIcon,
} from 'lucide-react';
import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Badge } from '@/components/common/Badge';
import { Button } from '@/components/common/Button';
import { Card } from '@/components/common/Card';
import { EmptyState } from '@/components/common/EmptyState';
import { PageHeader } from '@/components/common/PageHeader';
import { CATEGORY_ICONS, FALLBACK_CATEGORY_ICON } from '@/components/pos/categoryVisuals';
import { useClock } from '@/hooks/useClock';
import { useFormatters, type Formatters } from '@/hooks/useFormatters';
import { exportReportCsv } from '@/services/reportActions';
import { useMenuStore } from '@/store/menuStore';
import { useOrderStore } from '@/store/orderStore';
import { useReportStore } from '@/store/reportStore';
import { useUIStore } from '@/store/uiStore';
import type { OrderType, PaymentMethod, ReportTotals, SalesReport } from '@/types';
import { formatIsoDay } from '@/utils/format';
import {
  addDays,
  buildSalesReport,
  countRangeDays,
  findPeakHour,
  getPreviousRange,
  parseLocalDay,
  percentChange,
  resolveReportRange,
} from '@/utils/reports';
import { BarList, type BarListRow } from './BarList';
import { ChartCard, ReportTable } from './ChartCard';
import { ColumnChart, type ColumnDatum } from './ColumnChart';
import { ReportStatTile, type StatDelta } from './ReportStatTile';
import { ReportFilters } from './ReportFilters';
import { TopItemsTable } from './TopItemsTable';

const PAYMENT_ICONS: Record<PaymentMethod, LucideIcon> = { cash: Banknote, card: CreditCard, mobile: Smartphone };
const ORDER_TYPE_ICONS: Record<OrderType, LucideIcon> = { 'dine-in': UtensilsCrossed, takeaway: ShoppingBag, delivery: Bike };

function atHour(hour: number): Date {
  const date = new Date();
  date.setHours(hour, 0, 0, 0);
  return date;
}

/** Busy-hours window: the usual opening hours, widened to any hour that had orders. */
function visibleHours(report: SalesReport): number[] {
  const active = report.byHour.filter((entry) => entry.orders > 0).map((entry) => entry.hour);
  const first = Math.min(10, ...active);
  const last = Math.max(22, ...active);
  return Array.from({ length: last - first + 1 }, (_, index) => first + index);
}

/** Sales, best sellers, busy hours and payment mix for a date range. */
export function ReportsPage() {
  const { t } = useTranslation();
  const format = useFormatters();
  const orders = useOrderStore((state) => state.completedOrders);
  const menuItems = useMenuStore((state) => state.items);
  const categories = useMenuStore((state) => state.categories);
  const preset = useReportStore((state) => state.preset);
  const custom = useReportStore((state) => state.custom);
  const openModal = useUIStore((state) => state.openModal);
  const [exporting, setExporting] = useState(false);

  // Re-evaluated when the day changes, so "Today" rolls over at midnight.
  const todayKey = formatIsoDay(useClock(60_000));
  const range = useMemo(
    () => resolveReportRange(preset, parseLocalDay(todayKey) ?? new Date(), custom),
    [preset, custom, todayKey],
  );
  const report = useMemo(
    () => buildSalesReport(orders, range, { menuItems, categories }),
    [orders, range, menuItems, categories],
  );
  const previous = useMemo(() => buildSalesReport(orders, getPreviousRange(range)).totals, [orders, range]);

  const days = countRangeDays(range);
  const lastDay = addDays(range.end, -1);
  const rangeText =
    days === 1
      ? format.longDate(range.start)
      : t('reports.rangeSummary', { start: format.date(range.start), end: format.date(lastDay) });
  const hasData = report.totals.orders + report.totals.cancelledOrders > 0;

  const exportCsv = async () => {
    setExporting(true);
    try {
      await exportReportCsv(orders, range);
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="flex h-full flex-col">
      <PageHeader
        title={t('reports.title')}
        description={rangeText}
        actions={
          <>
            <Button
              variant="secondary"
              icon={<FileSpreadsheet className="size-5" aria-hidden />}
              onClick={() => void exportCsv()}
              loading={exporting}
              disabled={!hasData}
            >
              {t('reports.exportCsv')}
            </Button>
            <Button
              variant="primary"
              icon={<Printer className="size-5" aria-hidden />}
              onClick={() => openModal({ type: 'salesReport', start: range.start.toISOString(), end: range.end.toISOString() })}
              disabled={!hasData}
            >
              {t('reports.print')}
            </Button>
          </>
        }
      />

      <div className="min-h-0 flex-1 overflow-y-auto">
        <div className="space-y-4 p-4 sm:space-y-5 sm:p-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <ReportFilters />
            {report.includesSample && (
              <Badge tone="info" size="md" icon={<FlaskConical className="size-4" aria-hidden />}>
                {t('reports.includesSample')}
              </Badge>
            )}
          </div>

          {hasData ? (
            <ReportContent report={report} previous={previous} days={days} format={format} />
          ) : (
            <Card>
              <EmptyState icon={<ChartColumn aria-hidden />} title={t('reports.noData')} description={t('reports.noDataHint')} />
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}

function ReportContent({
  report,
  previous,
  days,
  format,
}: {
  report: SalesReport;
  previous: ReportTotals;
  days: number;
  format: Formatters;
}) {
  const { t } = useTranslation();
  const categories = useMenuStore((state) => state.categories);
  const { totals } = report;
  const share = (value: number) => format.percent(Math.round(value * 1000) / 10);
  const ordersLabel = (count: number) => t('reports.ordersCount', { count });

  const delta = (current: number, before: number, upIsGood = true): StatDelta => {
    const change = percentChange(current, before);
    const valueLabel = change === null ? '' : format.percent(Math.abs(change));
    return {
      change,
      upIsGood,
      valueLabel,
      srLabel:
        change === null || change === 0
          ? t('reports.noChange')
          : t(change > 0 ? 'reports.increased' : 'reports.decreased', { value: valueLabel }),
      caption: change === null ? t('reports.newActivity') : t('reports.vsPrevious', { count: days }),
    };
  };

  /* ------------------------------ Sales trend ------------------------------ */
  const trendData: ColumnDatum[] = report.trend.map((point) => {
    const start = new Date(point.start);
    const axisLabel =
      report.granularity === 'hour'
        ? format.digits(String(start.getHours()).padStart(2, '0'))
        : report.granularity === 'day'
          ? format.shortDate(start)
          : format.monthYear(start);
    const title =
      report.granularity === 'hour'
        ? `${format.time(start)} – ${format.time(new Date(start.getTime() + 3_600_000))}`
        : report.granularity === 'day'
          ? format.longDate(start)
          : format.monthYear(start);
    return { key: point.start, axisLabel, title, value: point.sales, detail: ordersLabel(point.orders) };
  });

  /* ------------------------------ Busy hours ------------------------------- */
  const hours = visibleHours(report);
  const hourData: ColumnDatum[] = hours.map((hour) => {
    const entry = report.byHour[hour];
    return {
      key: String(hour),
      axisLabel: format.digits(String(hour).padStart(2, '0')),
      title: `${format.time(atHour(hour))} – ${format.time(atHour(hour + 1))}`,
      value: entry?.orders ?? 0,
      detail: format.currency(entry?.sales ?? 0),
    };
  });
  const peak = findPeakHour(report.byHour);

  /* ------------------------------- Breakdowns ------------------------------ */
  const paymentRows: BarListRow[] = report.byPayment.map((row) => {
    const Icon = PAYMENT_ICONS[row.key];
    return {
      key: row.key,
      label: t(`paymentMethod.${row.key}`),
      value: row.sales,
      valueLabel: format.currency(row.sales),
      detail: ordersLabel(row.orders),
      icon: <Icon aria-hidden />,
    };
  });
  const typeRows: BarListRow[] = report.byOrderType.map((row) => {
    const Icon = ORDER_TYPE_ICONS[row.key];
    return {
      key: row.key,
      label: t(`orderType.${row.key}`),
      value: row.sales,
      valueLabel: format.currency(row.sales),
      detail: ordersLabel(row.orders),
      icon: <Icon aria-hidden />,
    };
  });
  const categoryRows: BarListRow[] = report.byCategory.map((row) => {
    const category = categories.find((entry) => entry.id === row.categoryId);
    const Icon = (category && CATEGORY_ICONS[category.icon]) || FALLBACK_CATEGORY_ICON;
    return {
      key: row.categoryId,
      label: row.name ? format.text(row.name) : t('reports.uncategorized'),
      value: row.sales,
      valueLabel: format.currency(row.sales),
      detail: t('reports.quantityCount', { count: row.quantity }),
      icon: <Icon aria-hidden />,
    };
  });
  const cashierRows: BarListRow[] = report.byCashier.map((row) => ({
    key: row.name,
    label: row.name,
    value: row.sales,
    valueLabel: format.currency(row.sales),
    detail: ordersLabel(row.orders),
    icon: <UserRound aria-hidden />,
  }));

  const trendTitle = t(`reports.salesTrend.${report.granularity}`);

  return (
    <>
      <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-3 2xl:grid-cols-6">
        <ReportStatTile
          emphasis
          label={t('reports.kpi.sales')}
          value={format.currency(totals.sales)}
          icon={<Wallet aria-hidden />}
          delta={delta(totals.sales, previous.sales)}
        />
        <ReportStatTile
          label={t('reports.kpi.orders')}
          value={format.number(totals.orders)}
          icon={<ReceiptText aria-hidden />}
          delta={delta(totals.orders, previous.orders)}
        />
        <ReportStatTile
          label={t('reports.kpi.averageOrder')}
          value={format.currency(totals.averageOrder)}
          icon={<ChartColumn aria-hidden />}
          delta={delta(totals.averageOrder, previous.averageOrder)}
        />
        <ReportStatTile
          label={t('reports.kpi.itemsSold')}
          value={format.number(totals.itemsSold)}
          icon={<UtensilsCrossed aria-hidden />}
          delta={delta(totals.itemsSold, previous.itemsSold)}
        />
        <ReportStatTile
          label={t('reports.kpi.discount')}
          value={format.currency(totals.discount)}
          icon={<Percent aria-hidden />}
          delta={delta(totals.discount, previous.discount, false)}
        />
        <ReportStatTile
          label={t('reports.kpi.cancelled')}
          value={format.number(totals.cancelledOrders)}
          icon={<Ban aria-hidden />}
          delta={delta(totals.cancelledOrders, previous.cancelledOrders, false)}
          footnote={totals.cancelledOrders > 0 ? t('reports.cancelledValue', { amount: format.currency(totals.cancelledValue) }) : undefined}
        />
      </div>

      <div className="grid gap-4 sm:gap-5 xl:grid-cols-3">
        <ChartCard
          className="xl:col-span-2"
          title={trendTitle}
          description={t('reports.salesTrendHint')}
          table={
            <ReportTable
              columns={[
                { label: t('reports.columns.period') },
                { label: t('reports.columns.orders'), numeric: true },
                { label: t('reports.columns.sales'), numeric: true },
              ]}
              rows={report.trend.map((point, index) => [
                trendData[index]?.title,
                format.number(point.orders),
                format.currency(point.sales),
              ])}
            />
          }
        >
          <ColumnChart
            data={trendData}
            label={t('reports.chartHint', { title: trendTitle })}
            formatValue={format.currency}
            formatTick={(value) => format.number(value)}
          />
        </ChartCard>

        <ChartCard
          title={t('reports.busyHours')}
          description={t('reports.busyHoursHint')}
          badge={
            peak && (
              <Badge tone="primary" size="md">
                {t('reports.peakHour', { hour: format.time(atHour(peak.hour)) })}
              </Badge>
            )
          }
          table={
            <ReportTable
              columns={[
                { label: t('reports.columns.hour') },
                { label: t('reports.columns.orders'), numeric: true },
                { label: t('reports.columns.sales'), numeric: true },
              ]}
              rows={hourData.map((datum) => [datum.title, format.number(datum.value), datum.detail])}
            />
          }
        >
          <ColumnChart
            data={hourData}
            integer
            label={t('reports.chartHint', { title: t('reports.busyHours') })}
            formatValue={ordersLabel}
            formatTick={(value) => format.number(value)}
          />
        </ChartCard>
      </div>

      <div className="grid items-start gap-4 sm:gap-5 xl:grid-cols-3">
        <div className="grid gap-4 sm:gap-5 lg:grid-cols-2 xl:grid-cols-1">
          <ChartCard title={t('reports.paymentMethods')}>
            <BarList rows={paymentRows} total={totals.sales} formatShare={share} label={t('reports.paymentMethods')} />
          </ChartCard>
          <ChartCard title={t('reports.orderTypes')}>
            <BarList rows={typeRows} total={totals.sales} formatShare={share} label={t('reports.orderTypes')} />
          </ChartCard>
        </div>
        <ChartCard className="xl:col-span-2" title={t('reports.topItems')} description={t('reports.topItemsHint')}>
          <TopItemsTable items={report.topItems} itemsSold={totals.itemsSold} format={format} />
        </ChartCard>
      </div>

      <div className="grid items-start gap-4 sm:gap-5 lg:grid-cols-2 xl:grid-cols-3">
        <ChartCard title={t('reports.categories')} description={t('reports.categoriesHint')} className="xl:col-span-2">
          <BarList rows={categoryRows} total={totals.grossSales} formatShare={share} label={t('reports.categories')} />
        </ChartCard>
        <div className="grid gap-4 sm:gap-5">
          <ChartCard title={t('reports.summary')} description={t('reports.summaryHint')}>
            <SalesSummary totals={totals} format={format} />
          </ChartCard>
          <ChartCard title={t('reports.cashiers')}>
            <BarList rows={cashierRows} total={totals.sales} formatShare={share} label={t('reports.cashiers')} />
          </ChartCard>
        </div>
      </div>
    </>
  );
}

/** How item sales become total sales: item sales − discounts + tax = total. */
function SalesSummary({ totals, format }: { totals: ReportTotals; format: Formatters }) {
  const { t } = useTranslation();
  const rows: { label: string; value: string; sign?: string }[] = [
    { label: t('salesReport.grossSales'), value: format.currency(totals.grossSales) },
    { label: t('salesReport.discount'), value: format.currency(totals.discount), sign: '−' },
    { label: t('salesReport.tax'), value: format.currency(totals.tax), sign: '+' },
  ];
  return (
    <dl className="space-y-2">
      {rows.map((row) => (
        <div key={row.label} className="flex items-baseline justify-between gap-3">
          <dt className="text-fg-muted">
            {row.sign && (
              <span aria-hidden className="me-1.5 inline-block w-3 text-center font-bold">
                {row.sign}
              </span>
            )}
            {row.label}
          </dt>
          <dd className="font-semibold whitespace-nowrap tabular-nums">{row.value}</dd>
        </div>
      ))}
      <div className="flex items-baseline justify-between gap-3 border-t border-border pt-2">
        <dt className="font-bold">{t('salesReport.sales')}</dt>
        <dd className="text-lg font-extrabold whitespace-nowrap tabular-nums">{format.currency(totals.sales)}</dd>
      </div>
      <div className="flex items-baseline justify-between gap-3 text-sm text-fg-muted">
        <dt>{t('reports.kpi.cancelled')}</dt>
        <dd className="whitespace-nowrap tabular-nums">
          {format.number(totals.cancelledOrders)} · {format.currency(totals.cancelledValue)}
        </dd>
      </div>
    </dl>
  );
}
