import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { PrintDialog } from '@/components/printing/PrintDialog';
import { useMenuStore } from '@/store/menuStore';
import { useOrderStore } from '@/store/orderStore';
import { useSettingsStore } from '@/store/settingsStore';
import { buildSalesReport } from '@/utils/reports';

/** Print dialog of the thermal sales report for a range. */
export function SalesReportModal({ start, end, onClose }: { start: string; end: string; onClose: () => void }) {
  const { t } = useTranslation();
  const orders = useOrderStore((state) => state.completedOrders);
  const menuItems = useMenuStore((state) => state.items);
  const categories = useMenuStore((state) => state.categories);
  const language = useSettingsStore((state) => state.settings.language);

  const report = useMemo(
    () => buildSalesReport(orders, { start: new Date(start), end: new Date(end) }, { menuItems, categories }),
    [orders, start, end, menuItems, categories],
  );

  return (
    <PrintDialog
      document={{ type: 'salesReport', report, language }}
      title={t('reports.print')}
      successKey="print.salesReportPrinted"
      onClose={onClose}
    />
  );
}
