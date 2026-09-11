import { Save, Store, Undo2 } from 'lucide-react';
import { useState, type FormEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/common/Button';
import { Input } from '@/components/common/Input';
import { message } from '@/i18n/keys';
import { useSettingsStore } from '@/store/settingsStore';
import { toast } from '@/store/uiStore';
import type { AppSettings } from '@/types';
import { getErrorMessageKey } from '@/utils/errors';
import { isValidPhone } from '@/utils/parse';
import { SettingsSection } from './SettingsSection';

interface RestaurantForm {
  nameBn: string;
  nameEn: string;
  addressBn: string;
  addressEn: string;
  phone: string;
  taxId: string;
  footerBn: string;
  footerEn: string;
}

function toForm(settings: AppSettings): RestaurantForm {
  return {
    nameBn: settings.name.bn,
    nameEn: settings.name.en,
    addressBn: settings.address.bn,
    addressEn: settings.address.en,
    phone: settings.phone,
    taxId: settings.taxId,
    footerBn: settings.receiptFooter.bn,
    footerEn: settings.receiptFooter.en,
  };
}

/** Restaurant name/address in both languages, phone, tax ID, receipt footer. */
export function RestaurantSettings() {
  const { t } = useTranslation();
  const settings = useSettingsStore((state) => state.settings);
  const updateSettings = useSettingsStore((state) => state.updateSettings);
  const [form, setForm] = useState<RestaurantForm>(() => toForm(settings));
  const [submitted, setSubmitted] = useState(false);
  const [saving, setSaving] = useState(false);

  const saved = toForm(settings);
  const dirty = (Object.keys(form) as (keyof RestaurantForm)[]).some((key) => form[key] !== saved[key]);
  const errors = {
    nameBn: !form.nameBn.trim() ? t('validation.required') : undefined,
    nameEn: !form.nameEn.trim() ? t('validation.required') : undefined,
    phone: form.phone.trim() && !isValidPhone(form.phone) ? t('validation.phoneInvalid') : undefined,
  };
  const hasErrors = Object.values(errors).some(Boolean);
  const field = (key: keyof RestaurantForm) => ({
    value: form[key],
    onChange: (event: { target: { value: string } }) => setForm((previous) => ({ ...previous, [key]: event.target.value })),
  });

  const save = async (event?: FormEvent) => {
    event?.preventDefault();
    setSubmitted(true);
    if (hasErrors) return;
    setSaving(true);
    try {
      await updateSettings({
        name: { bn: form.nameBn.trim(), en: form.nameEn.trim() },
        address: { bn: form.addressBn.trim(), en: form.addressEn.trim() },
        phone: form.phone.trim(),
        taxId: form.taxId.trim(),
        receiptFooter: { bn: form.footerBn.trim(), en: form.footerEn.trim() },
      });
      toast.success(message('settings.saved'));
      setSubmitted(false);
    } catch (error) {
      toast.error(message(getErrorMessageKey(error, 'errors.settingsSaveFailed')));
    } finally {
      setSaving(false);
    }
  };

  return (
    <SettingsSection
      title={t('settings.restaurant.title')}
      description={t('settings.restaurant.description')}
      icon={<Store className="size-5" aria-hidden />}
    >
      <form onSubmit={(event) => void save(event)} className="space-y-5">
        <div className="grid gap-4 md:grid-cols-2">
          <Input label={t('settings.restaurant.nameBn')} lang="bn" required maxLength={80} error={submitted ? errors.nameBn : undefined} {...field('nameBn')} />
          <Input label={t('settings.restaurant.nameEn')} lang="en" required maxLength={80} error={submitted ? errors.nameEn : undefined} {...field('nameEn')} />
          <Input label={t('settings.restaurant.addressBn')} lang="bn" maxLength={160} {...field('addressBn')} />
          <Input label={t('settings.restaurant.addressEn')} lang="en" maxLength={160} {...field('addressEn')} />
          <Input label={t('settings.restaurant.phone')} inputMode="tel" maxLength={24} error={submitted ? errors.phone : undefined} {...field('phone')} />
          <Input label={t('settings.restaurant.taxId')} maxLength={40} {...field('taxId')} />
          <Input label={t('settings.restaurant.footerBn')} lang="bn" maxLength={120} {...field('footerBn')} />
          <Input label={t('settings.restaurant.footerEn')} lang="en" maxLength={120} {...field('footerEn')} />
        </div>
        <div className="flex justify-end gap-3">
          <Button variant="ghost" icon={<Undo2 className="size-5" aria-hidden />} onClick={() => setForm(saved)} disabled={!dirty || saving}>
            {t('common.reset')}
          </Button>
          <Button type="submit" variant="primary" icon={<Save className="size-5" aria-hidden />} loading={saving} disabled={!dirty}>
            {t('common.saveChanges')}
          </Button>
        </div>
      </form>
    </SettingsSection>
  );
}
