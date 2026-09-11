import { ChefHat, Printer, RefreshCw, ReceiptText } from 'lucide-react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/common/Button';
import { SegmentedControl } from '@/components/common/SegmentedControl';
import { Select } from '@/components/common/Select';
import { Switch } from '@/components/common/Switch';
import { APP_CONFIG, PAPER_WIDTHS } from '@/config/app.config';
import { useFormatters } from '@/hooks/useFormatters';
import { usePrinters } from '@/hooks/usePrinters';
import { message } from '@/i18n/keys';
import { printTestDocument } from '@/services/printActions';
import { isDesktopRuntime } from '@/services/storage';
import { useSettingsStore } from '@/store/settingsStore';
import { toast } from '@/store/uiStore';
import type { PaperWidth, PrinterSettings as PrinterSettingsModel, PrintKind } from '@/types';
import { getErrorMessageKey } from '@/utils/errors';
import { printerSelectOptions } from '@/utils/printers';
import { SettingRow, SettingsSection } from './SettingsSection';

/** Receipt/KOT printers, paper width, silent & automatic printing, tests. */
export function PrinterSettings() {
  const { t } = useTranslation();
  const format = useFormatters();
  const printer = useSettingsStore((state) => state.settings.printer);
  const updatePrinter = useSettingsStore((state) => state.updatePrinter);
  const desktop = isDesktopRuntime();
  const { printers, loading: loadingPrinters, refresh: refreshPrinters } = usePrinters();
  const [testing, setTesting] = useState<PrintKind | null>(null);

  const update = (patch: Partial<PrinterSettingsModel>) =>
    updatePrinter(patch).catch((error: unknown) => toast.error(message(getErrorMessageKey(error, 'errors.settingsSaveFailed'))));

  const printerOptions = (current: string, emptyLabel: string) =>
    printerSelectOptions(printers, current, emptyLabel, loadingPrinters ? undefined : (name) => t('print.printerMissing', { name }));

  const maxCopies = Math.max(...APP_CONFIG.print.copyOptions);

  const test = async (kind: PrintKind) => {
    setTesting(kind);
    try {
      await printTestDocument(kind);
    } finally {
      setTesting(null);
    }
  };

  return (
    <SettingsSection
      title={t('settings.printer.title')}
      description={t('settings.printer.description')}
      icon={<Printer className="size-5" aria-hidden />}
      actions={
        desktop && (
          <Button variant="ghost" size="sm" icon={<RefreshCw className="size-4" aria-hidden />} onClick={refreshPrinters} loading={loadingPrinters}>
            {t('settings.printer.refresh')}
          </Button>
        )
      }
    >
      {!desktop && <p className="mb-4 rounded-control bg-warning/10 p-3 text-sm text-warning-text">{t('settings.printer.desktopOnly')}</p>}
      {desktop && !loadingPrinters && printers.length === 0 && (
        <p className="mb-4 rounded-control bg-warning/10 p-3 text-sm text-warning-text">{t('settings.printer.noPrinters')}</p>
      )}

      <div className="grid gap-4 md:grid-cols-2">
        <Select
          label={t('settings.printer.receiptPrinter')}
          value={printer.receiptPrinter}
          onValueChange={(value) => void update({ receiptPrinter: value })}
          options={printerOptions(printer.receiptPrinter, t('settings.printer.systemDefault'))}
          disabled={!desktop}
        />
        <Select
          label={t('settings.printer.kotPrinter')}
          value={printer.kotPrinter}
          onValueChange={(value) => void update({ kotPrinter: value })}
          options={printerOptions(printer.kotPrinter, t('settings.printer.sameAsReceipt'))}
          disabled={!desktop}
        />
      </div>

      <div className="mt-4">
        <SettingRow label={t('settings.printer.paperWidth')}>
          <SegmentedControl<PaperWidth>
            label={t('settings.printer.paperWidth')}
            value={printer.paperWidth}
            onValueChange={(value) => void update({ paperWidth: value })}
            options={PAPER_WIDTHS.map((width) => ({ value: width, label: width }))}
          />
        </SettingRow>
        <SettingRow label={t('settings.printer.copies')}>
          <SegmentedControl<string>
            label={t('settings.printer.copies')}
            value={String(Math.min(Math.max(printer.receiptCopies, 1), maxCopies))}
            onValueChange={(value) => void update({ receiptCopies: Number(value) })}
            options={APP_CONFIG.print.copyOptions.map((count) => ({ value: String(count), label: format.number(count) }))}
          />
        </SettingRow>
      </div>

      <div className="divide-y divide-border border-y border-border">
        <Switch
          className="py-2"
          label={t('settings.printer.silentPrint')}
          description={t('settings.printer.silentPrintHint')}
          checked={printer.silentPrint}
          onCheckedChange={(checked) => void update({ silentPrint: checked })}
        />
        <Switch
          className="py-2"
          label={t('settings.printer.autoPrintReceipt')}
          checked={printer.autoPrintReceipt}
          onCheckedChange={(checked) => void update({ autoPrintReceipt: checked })}
        />
        <Switch
          className="py-2"
          label={t('settings.printer.autoPrintKot')}
          checked={printer.autoPrintKot}
          onCheckedChange={(checked) => void update({ autoPrintKot: checked })}
        />
        <Switch
          className="py-2"
          label={t('settings.printer.showPricesOnKot')}
          checked={printer.showPricesOnKot}
          onCheckedChange={(checked) => void update({ showPricesOnKot: checked })}
        />
      </div>

      <div className="mt-4 flex flex-wrap justify-end gap-3">
        <Button
          variant="secondary"
          icon={<ReceiptText className="size-5" aria-hidden />}
          onClick={() => void test('receipt')}
          loading={testing === 'receipt'}
          disabled={testing !== null && testing !== 'receipt'}
        >
          {t('settings.printer.testReceipt')}
        </Button>
        <Button
          variant="secondary"
          icon={<ChefHat className="size-5" aria-hidden />}
          onClick={() => void test('kot')}
          loading={testing === 'kot'}
          disabled={testing !== null && testing !== 'kot'}
        >
          {t('settings.printer.testKot')}
        </Button>
      </div>
    </SettingsSection>
  );
}
