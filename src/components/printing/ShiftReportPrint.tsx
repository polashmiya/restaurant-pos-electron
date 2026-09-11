import type { Shift } from '@/types';
import { calculateCashDifference, calculateExpectedCash } from '@/utils/shiftMath';
import type { DocumentContext } from './documentTypes';
import { paperClass } from './printStyles';

/** Thermal shift (Z) report: sales by payment method, tax, discounts, cash drawer. */
export function ShiftReportPrint({ shift, context, printedAt }: { shift: Shift; context: DocumentContext; printedAt?: string }) {
  const { t, format, restaurant, language, paperWidth } = context;
  const expected = calculateExpectedCash(shift);
  const rows: [string, string][] = [
    [t('shift.orderCount'), format.number(shift.orderCount)],
    [t('shift.totalRevenue'), format.currency(shift.totalSales)],
    [t('shift.cashSales'), format.currency(shift.cashSales)],
    [t('shift.cardSales'), format.currency(shift.cardSales)],
    [t('shift.mobileSales'), format.currency(shift.mobileSales)],
    [t('shift.taxCollected'), format.currency(shift.taxCollected)],
    [t('shift.discountGiven'), format.currency(shift.discountTotal)],
  ];

  return (
    <div className={paperClass(paperWidth)} lang={language} data-document="shift-report">
      <p className="title c">{format.text(restaurant.name)}</p>
      <hr />
      <p className="heading">{t('shiftReport.title')}</p>
      <table className="meta">
        <tbody>
          <tr>
            <th>{t('shiftReport.cashier')}</th>
            <td>{shift.cashierName}</td>
          </tr>
          <tr>
            <th>{t('shiftReport.opened')}</th>
            <td>{format.dateTime(shift.openedAt)}</td>
          </tr>
          {shift.closedAt && (
            <tr>
              <th>{t('shiftReport.closed')}</th>
              <td>{format.dateTime(shift.closedAt)}</td>
            </tr>
          )}
        </tbody>
      </table>
      <hr />
      <table>
        <tbody>
          {rows.map(([label, value]) => (
            <tr key={label}>
              <td>{label}</td>
              <td className="num">{value}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <hr />
      <table>
        <tbody>
          <tr>
            <td>{t('shiftReport.openingCash')}</td>
            <td className="num">{format.currency(shift.openingCash)}</td>
          </tr>
          <tr className="strong">
            <td>{t('shiftReport.expectedCash')}</td>
            <td className="num">{format.currency(expected)}</td>
          </tr>
          {shift.closingCash !== undefined && (
            <>
              <tr>
                <td>{t('shiftReport.closingCash')}</td>
                <td className="num">{format.currency(shift.closingCash)}</td>
              </tr>
              <tr className="strong">
                <td>{t('shiftReport.difference')}</td>
                <td className="num">{format.currency(calculateCashDifference(shift, shift.closingCash))}</td>
              </tr>
            </>
          )}
        </tbody>
      </table>
      {shift.notes && (
        <>
          <hr />
          <p className="small">{shift.notes}</p>
        </>
      )}
      <hr />
      <p className="small c">
        {t('shiftReport.printedAt')}: {format.dateTime(printedAt ?? new Date().toISOString())}
      </p>
    </div>
  );
}
