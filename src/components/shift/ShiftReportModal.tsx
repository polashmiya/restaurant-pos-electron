import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { PrintDialog } from '@/components/printing/PrintDialog';
import { useSettingsStore } from '@/store/settingsStore';
import { useShiftStore } from '@/store/shiftStore';

export function ShiftReportModal({ shiftId, onClose }: { shiftId: string; onClose: () => void }) {
  const { t } = useTranslation();
  const shift = useShiftStore((state) => state.shifts.find((entry) => entry.id === shiftId));
  const language = useSettingsStore((state) => state.settings.language);

  useEffect(() => {
    if (!shift) onClose();
  }, [shift, onClose]);

  if (!shift) return null;

  return (
    <PrintDialog
      document={{ type: 'shiftReport', shift, language }}
      title={t('shiftReport.title')}
      description={shift.cashierName}
      successKey="print.reportPrinted"
      printLabel={t('shift.printReport')}
      onClose={onClose}
    />
  );
}
