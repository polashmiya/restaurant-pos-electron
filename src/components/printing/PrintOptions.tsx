import { useTranslation } from 'react-i18next';
import { Notice } from '@/components/common/Notice';
import { SegmentedControl } from '@/components/common/SegmentedControl';
import { Select } from '@/components/common/Select';
import { APP_CONFIG } from '@/config/app.config';
import { useFormatters } from '@/hooks/useFormatters';
import type { PrintJob } from '@/hooks/usePrintJob';
import { isDesktopRuntime } from '@/services/storage';
import { useSettingsStore } from '@/store/settingsStore';
import { printerSelectOptions } from '@/utils/printers';

/**
 * Printer and number of copies for a print dialog. Desktop only — in the
 * browser, printing opens the browser's own dialog.
 */
export function PrintOptions({ job }: { job: PrintJob }) {
  const { t } = useTranslation();
  const format = useFormatters();
  const paperWidth = useSettingsStore((state) => state.settings.printer.paperWidth);
  if (!isDesktopRuntime()) return null;

  const { target, printers, loadingPrinters } = job;
  const noPrinters = !loadingPrinters && printers.length === 0;

  return (
    <div className="space-y-4">
      <Select
        label={t('print.printer')}
        hint={t('print.paperHint', { width: paperWidth })}
        value={target.printerName}
        onValueChange={job.setPrinterName}
        options={printerSelectOptions(
          printers,
          target.printerName,
          t('settings.printer.systemDefault'),
          loadingPrinters ? undefined : (name) => t('print.printerMissing', { name }),
        )}
        disabled={job.busy !== null}
      />
      <div className="space-y-2">
        <p className="text-sm font-semibold">{t('print.copies')}</p>
        <SegmentedControl<string>
          label={t('print.copies')}
          value={String(target.copies)}
          onValueChange={(value) => job.setCopies(Number(value))}
          options={APP_CONFIG.print.copyOptions.map((count) => ({
            value: String(count),
            label: format.number(count),
            disabled: job.busy !== null,
          }))}
        />
      </div>
      {noPrinters && <Notice tone="warning">{t('print.noPrinterHint')}</Notice>}
    </div>
  );
}
