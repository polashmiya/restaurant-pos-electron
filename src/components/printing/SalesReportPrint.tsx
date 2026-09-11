import type { Formatters } from '@/hooks/useFormatters';
import type { BreakdownRow, SalesReport } from '@/types';
import { addDays } from '@/utils/reports';
import type { DocumentContext } from './documentTypes';
import { paperClass } from './printStyles';

function BreakdownSection<K extends string>({
  heading,
  rows,
  label,
  format,
}: {
  heading: string;
  rows: readonly BreakdownRow<K>[];
  label: (key: K) => string;
  format: Formatters;
}) {
  return (
    <>
      <hr />
      <p className="strong">{heading}</p>
      <table>
        <tbody>
          {rows.map((row) => (
            <tr key={row.key}>
              <td>{label(row.key)}</td>
              <td className="qty">{format.number(row.orders)}</td>
              <td className="num">{format.currency(row.sales)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </>
  );
}

/** Thermal sales report for a date range: totals, payments, order types, best sellers. */
export function SalesReportPrint({
  report,
  context,
  printedAt,
}: {
  report: SalesReport;
  context: DocumentContext;
  printedAt?: string;
}) {
  const { t, format, restaurant, language, paperWidth } = context;
  const { totals } = report;
  const lastDay = addDays(new Date(report.range.end), -1);

  const summary: { label: string; value: string; strong?: boolean }[] = [
    { label: t('salesReport.orders'), value: format.number(totals.orders) },
    { label: t('salesReport.sales'), value: format.currency(totals.sales), strong: true },
    { label: t('salesReport.averageOrder'), value: format.currency(totals.averageOrder) },
    { label: t('salesReport.itemsSold'), value: format.number(totals.itemsSold) },
    { label: t('salesReport.grossSales'), value: format.currency(totals.grossSales) },
    { label: t('salesReport.discount'), value: format.currency(totals.discount) },
    { label: t('salesReport.tax'), value: format.currency(totals.tax) },
    {
      label: t('salesReport.cancelled'),
      value: `${format.number(totals.cancelledOrders)} · ${format.currency(totals.cancelledValue)}`,
    },
  ];

  return (
    <div className={paperClass(paperWidth)} lang={language} data-document="sales-report">
      <p className="title c">{format.text(restaurant.name)}</p>
      <hr />
      <p className="heading">{t('salesReport.title')}</p>
      <table className="meta">
        <tbody>
          <tr>
            <th>{t('salesReport.from')}</th>
            <td>{format.date(report.range.start)}</td>
          </tr>
          <tr>
            <th>{t('salesReport.to')}</th>
            <td>{format.date(lastDay)}</td>
          </tr>
        </tbody>
      </table>
      {report.includesSample && <p className="small c">[ {t('salesReport.includesSample')} ]</p>}
      <hr />
      <table>
        <tbody>
          {summary.map((row) => (
            <tr key={row.label} className={row.strong ? 'strong' : undefined}>
              <td>{row.label}</td>
              <td className="num">{row.value}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <BreakdownSection
        heading={t('salesReport.payment')}
        rows={report.byPayment}
        label={(method) => t(`paymentMethod.${method}`)}
        format={format}
      />
      <BreakdownSection
        heading={t('salesReport.orderTypes')}
        rows={report.byOrderType}
        label={(type) => t(`orderType.${type}`)}
        format={format}
      />

      {report.topItems.length > 0 && (
        <>
          <hr />
          <p className="strong">{t('salesReport.topItems')}</p>
          <table>
            <thead>
              <tr>
                <th>{t('salesReport.item')}</th>
                <th className="qty">{t('salesReport.qty')}</th>
                <th className="num">{t('salesReport.amount')}</th>
              </tr>
            </thead>
            <tbody>
              {report.topItems.map((item) => (
                <tr key={item.menuItemId}>
                  <td>{format.text(item.name)}</td>
                  <td className="qty">{format.number(item.quantity)}</td>
                  <td className="num">{format.currency(item.sales)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </>
      )}
      <hr />
      <p className="small c">
        {t('salesReport.printedAt')}: {format.dateTime(printedAt ?? new Date().toISOString())}
      </p>
    </div>
  );
}
