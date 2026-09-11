import { APP_CONFIG } from '@/config/app.config';
import { getFixedT } from '@/i18n';
import { message } from '@/i18n/keys';
import { useSettingsStore } from '@/store/settingsStore';
import { toast } from '@/store/uiStore';
import type { Language, Order, ReportRange } from '@/types';
import { splitLocalDateTime, toCsv, type CsvCell } from '@/utils/csv';
import { logError } from '@/utils/errors';
import { rangeFileStem } from '@/utils/fileNames';
import { localize } from '@/utils/localize';
import { getOrderTimestamp } from '@/utils/orderFilters';
import { selectOrdersInRange } from '@/utils/reports';

/* ==========================================================================
   Report export. One row per completed or cancelled order in the range, with
   headers in the current UI language and plain numbers (no currency symbol,
   Western digits) so spreadsheets can sum them.
   ========================================================================== */

export function buildOrdersCsv(orders: readonly Order[], language: Language): string {
  const t = getFixedT(language);
  const header: CsvCell[] = [
    t('reports.csv.orderNumber'),
    t('reports.csv.date'),
    t('reports.csv.time'),
    t('reports.csv.status'),
    t('reports.csv.type'),
    t('reports.csv.table'),
    t('reports.csv.customer'),
    t('reports.csv.phone'),
    t('reports.csv.items'),
    t('reports.csv.quantity'),
    t('reports.csv.subtotal'),
    t('reports.csv.discount'),
    t('reports.csv.tax'),
    t('reports.csv.total'),
    t('reports.csv.payment'),
    t('reports.csv.reference'),
    t('reports.csv.cashier'),
  ];
  const rows = [...orders]
    .sort((a, b) => getOrderTimestamp(a).localeCompare(getOrderTimestamp(b)))
    .map((order): CsvCell[] => {
      const { date, time } = splitLocalDateTime(getOrderTimestamp(order));
      return [
        order.orderNumber,
        date,
        time,
        t(`orderStatus.${order.status}`),
        t(`orderType.${order.orderType}`),
        order.tableName,
        order.customer?.name,
        order.customer?.phone,
        order.items.map((item) => `${localize(item.name, language)} × ${item.quantity}`).join('; '),
        order.items.reduce((count, item) => count + item.quantity, 0),
        order.subtotal,
        order.discount,
        order.tax,
        order.total,
        order.payment ? t(`paymentMethod.${order.payment.method}`) : undefined,
        order.payment?.reference,
        order.cashierName,
      ];
    });
  return toCsv([header, ...rows]);
}

export function reportFileName(range: ReportRange): string {
  return `${APP_CONFIG.reports.fileNamePrefix}-${rangeFileStem(range)}.csv`;
}

/** Browser preview mode: hand the file to the browser's download manager. */
function downloadInBrowser(fileName: string, csv: string): void {
  const url = URL.createObjectURL(new Blob(['\uFEFF', csv], { type: 'text/csv;charset=utf-8' }));
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/** Saves the orders of a report range as CSV (desktop: save dialog). */
export async function exportReportCsv(orders: readonly Order[], range: ReportRange): Promise<void> {
  const csv = buildOrdersCsv(selectOrdersInRange(orders, range), useSettingsStore.getState().settings.language);
  const fileName = reportFileName(range);
  try {
    const api = window.electronAPI;
    if (!api) {
      downloadInBrowser(fileName, csv);
      toast.success(message('reports.downloaded'));
      return;
    }
    const result = await api.data.saveCsv(fileName, csv);
    if (result.ok) toast.success(message('reports.exported', { path: result.filePath }), 8000);
    else if (result.reason === 'failed') toast.error(message('errors.reportExportFailed'));
  } catch (error) {
    logError('report-export', error);
    toast.error(message('errors.reportExportFailed'));
  }
}
