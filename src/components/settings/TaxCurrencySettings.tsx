import { Coins, Percent, Save, Undo2 } from 'lucide-react';
import { useState, type FormEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/common/Button';
import { Input } from '@/components/common/Input';
import { NumberInput } from '@/components/common/NumberInput';
import { Select } from '@/components/common/Select';
import { CURRENCIES } from '@/config/app.config';
import { useFormatters } from '@/hooks/useFormatters';
import { message } from '@/i18n/keys';
import { useSettingsStore } from '@/store/settingsStore';
import { toast } from '@/store/uiStore';
import { getErrorMessageKey } from '@/utils/errors';
import { formatCurrency } from '@/utils/format';
import { SettingsSection } from './SettingsSection';

/** Default tax rate, currency and currency symbol. */
export function TaxCurrencySettings() {
  const { t } = useTranslation();
  const format = useFormatters();
  const settings = useSettingsStore((state) => state.settings);
  const updateSettings = useSettingsStore((state) => state.updateSettings);
  const [taxRate, setTaxRate] = useState<number | null>(settings.defaultTaxRate);
  const [currency, setCurrency] = useState(settings.currency);
  const [symbol, setSymbol] = useState(settings.currencySymbol);
  const [saving, setSaving] = useState(false);

  const taxError = taxRate === null || taxRate < 0 || taxRate > 100 ? t('validation.taxRateRange') : undefined;
  const symbolError = !symbol.trim() ? t('validation.required') : undefined;
  const dirty = taxRate !== settings.defaultTaxRate || currency !== settings.currency || symbol !== settings.currencySymbol;

  const currencyOptions = CURRENCIES.some((option) => option.code === currency)
    ? CURRENCIES
    : [...CURRENCIES, { code: currency, symbol, name: { bn: currency, en: currency } }];

  const save = async (event?: FormEvent) => {
    event?.preventDefault();
    if (taxError || symbolError || taxRate === null) return;
    setSaving(true);
    try {
      await updateSettings({ defaultTaxRate: taxRate, currency, currencySymbol: symbol.trim() });
      toast.success(message('settings.saved'));
    } catch (error) {
      toast.error(message(getErrorMessageKey(error, 'errors.settingsSaveFailed')));
    } finally {
      setSaving(false);
    }
  };

  const revert = () => {
    setTaxRate(settings.defaultTaxRate);
    setCurrency(settings.currency);
    setSymbol(settings.currencySymbol);
  };

  return (
    <form onSubmit={(event) => void save(event)} className="space-y-6">
      <SettingsSection title={t('settings.tax.title')} icon={<Percent className="size-5" aria-hidden />}>
        <NumberInput
          label={t('settings.tax.defaultRate')}
          hint={t('settings.tax.rateHint')}
          value={taxRate}
          onValueChange={setTaxRate}
          suffix="%"
          error={taxError}
          containerClassName="max-w-sm"
        />
      </SettingsSection>

      <SettingsSection title={t('settings.currency.title')} icon={<Coins className="size-5" aria-hidden />}>
        <div className="grid gap-4 md:grid-cols-3">
          <Select
            label={t('settings.currency.label')}
            value={currency}
            onValueChange={(code) => {
              setCurrency(code);
              const option = CURRENCIES.find((entry) => entry.code === code);
              if (option) setSymbol(option.symbol);
            }}
            options={currencyOptions.map((option) => ({
              value: option.code,
              label: `${option.code} — ${format.text(option.name)}`,
            }))}
          />
          <Input
            label={t('settings.currency.symbol')}
            value={symbol}
            onChange={(event) => setSymbol(event.target.value)}
            maxLength={4}
            error={symbolError}
          />
          <div className="flex flex-col gap-1.5">
            <span className="text-sm font-semibold">{t('settings.currency.preview')}</span>
            <span className="flex min-h-touch items-center rounded-control border border-dashed border-border-strong px-4 text-xl font-bold tabular-nums">
              {formatCurrency(1250.5, { currencySymbol: symbol, numberFormat: settings.numberFormat })}
            </span>
          </div>
        </div>
      </SettingsSection>

      <div className="flex justify-end gap-3">
        <Button variant="ghost" icon={<Undo2 className="size-5" aria-hidden />} onClick={revert} disabled={!dirty || saving}>
          {t('common.reset')}
        </Button>
        <Button type="submit" variant="primary" icon={<Save className="size-5" aria-hidden />} loading={saving} disabled={!dirty || Boolean(taxError || symbolError)}>
          {t('common.saveChanges')}
        </Button>
      </div>
    </form>
  );
}
