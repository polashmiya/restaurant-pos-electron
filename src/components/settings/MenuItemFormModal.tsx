import { ImagePlus, Trash } from 'lucide-react';
import { useRef, useState, type FormEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/common/Button';
import { Input } from '@/components/common/Input';
import { Modal } from '@/components/common/Modal';
import { NumberInput } from '@/components/common/NumberInput';
import { Select } from '@/components/common/Select';
import { Switch } from '@/components/common/Switch';
import { useFormatters } from '@/hooks/useFormatters';
import { message } from '@/i18n/keys';
import { useMenuStore, useSortedCategories } from '@/store/menuStore';
import { toast } from '@/store/uiStore';
import type { MenuItem } from '@/types';
import { getErrorMessageKey } from '@/utils/errors';
import { createId } from '@/utils/id';
import { imageFileToDataUrl } from '@/utils/image';

interface ItemForm {
  code: string;
  nameBn: string;
  nameEn: string;
  descriptionBn: string;
  descriptionEn: string;
  categoryId: string;
  price: number | null;
  taxRate: number | null;
  preparationTime: number | null;
  isAvailable: boolean;
  image?: string;
}

function toForm(item: MenuItem | undefined, fallbackCategory: string): ItemForm {
  return {
    code: item?.code ?? '',
    nameBn: item?.name.bn ?? '',
    nameEn: item?.name.en ?? '',
    descriptionBn: item?.description?.bn ?? '',
    descriptionEn: item?.description?.en ?? '',
    categoryId: item?.categoryId ?? fallbackCategory,
    price: item?.price ?? null,
    taxRate: item?.taxRate ?? null,
    preparationTime: item?.preparationTime ?? null,
    isAvailable: item?.isAvailable ?? true,
    image: item?.image,
  };
}

/** Add / edit a bilingual menu item (Settings → Menu). */
export function MenuItemFormModal({ item, onClose }: { item?: MenuItem; onClose: () => void }) {
  const { t } = useTranslation();
  const format = useFormatters();
  const categories = useSortedCategories();
  const items = useMenuStore((state) => state.items);
  const saveItem = useMenuStore((state) => state.saveItem);
  const [form, setForm] = useState<ItemForm>(() => toForm(item, categories[0]?.id ?? ''));
  const [submitted, setSubmitted] = useState(false);
  const [saving, setSaving] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);

  const set = <K extends keyof ItemForm>(key: K, value: ItemForm[K]) => setForm((previous) => ({ ...previous, [key]: value }));

  const errors = {
    code: !form.code.trim() ? t('validation.required') : undefined,
    nameBn: !form.nameBn.trim() ? t('validation.required') : undefined,
    nameEn: !form.nameEn.trim() ? t('validation.required') : undefined,
    categoryId: !form.categoryId ? t('validation.required') : undefined,
    price: form.price === null ? t('validation.required') : form.price < 0 ? t('validation.min', { min: format.number(0) }) : undefined,
    taxRate: form.taxRate !== null && (form.taxRate < 0 || form.taxRate > 100) ? t('validation.taxRateRange') : undefined,
  };
  const hasErrors = Object.values(errors).some(Boolean);

  const pickImage = async (file: File | undefined) => {
    if (!file) return;
    try {
      set('image', await imageFileToDataUrl(file));
    } catch (error) {
      toast.error(message(getErrorMessageKey(error, 'errors.imageFailed')));
    }
  };

  const submit = async (event?: FormEvent) => {
    event?.preventDefault();
    setSubmitted(true);
    if (hasErrors || form.price === null) return;
    const descriptionGiven = form.descriptionBn.trim() || form.descriptionEn.trim();
    const next: MenuItem = {
      id: item?.id ?? createId('item'),
      code: form.code.trim().toUpperCase(),
      name: { bn: form.nameBn.trim(), en: form.nameEn.trim() },
      ...(descriptionGiven ? { description: { bn: form.descriptionBn.trim(), en: form.descriptionEn.trim() } } : {}),
      categoryId: form.categoryId,
      price: form.price,
      isAvailable: form.isAvailable,
      ...(form.image ? { image: form.image } : {}),
      ...(form.taxRate !== null ? { taxRate: form.taxRate } : {}),
      ...(form.preparationTime !== null && form.preparationTime > 0 ? { preparationTime: Math.round(form.preparationTime) } : {}),
      sortOrder: item?.sortOrder ?? items.reduce((max, entry) => Math.max(max, entry.sortOrder ?? 0), 0) + 1,
    };
    setSaving(true);
    try {
      await saveItem(next);
      toast.success(message('settings.menu.itemSaved'));
      onClose();
    } catch (error) {
      toast.error(message(getErrorMessageKey(error)));
      setSaving(false);
    }
  };

  return (
    <Modal
      open
      onClose={onClose}
      title={item ? t('settings.menu.editItem') : t('settings.menu.addItem')}
      size="lg"
      dismissible={!saving}
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={saving}>
            {t('common.cancel')}
          </Button>
          <Button variant="primary" onClick={() => void submit()} loading={saving}>
            {t('common.save')}
          </Button>
        </>
      }
    >
      <form onSubmit={(event) => void submit(event)} className="grid gap-4 md:grid-cols-2">
        <Input label={t('settings.menu.nameBn')} lang="bn" required maxLength={80} value={form.nameBn} onChange={(event) => set('nameBn', event.target.value)} error={submitted ? errors.nameBn : undefined} data-autofocus />
        <Input label={t('settings.menu.nameEn')} lang="en" required maxLength={80} value={form.nameEn} onChange={(event) => set('nameEn', event.target.value)} error={submitted ? errors.nameEn : undefined} />
        <Input label={t('settings.menu.code')} required maxLength={20} value={form.code} onChange={(event) => set('code', event.target.value)} error={submitted ? errors.code : undefined} />
        <Select
          label={t('settings.menu.category')}
          required
          value={form.categoryId}
          onValueChange={(value) => set('categoryId', value)}
          options={categories.map((category) => ({ value: category.id, label: format.text(category.name) }))}
          error={submitted ? errors.categoryId : undefined}
        />
        <NumberInput label={t('settings.menu.price')} required value={form.price} onValueChange={(value) => set('price', value)} prefix={format.context.currencySymbol} error={submitted ? errors.price : undefined} />
        <NumberInput label={t('settings.menu.taxRate')} hint={t('settings.menu.taxRateHint')} value={form.taxRate} onValueChange={(value) => set('taxRate', value)} suffix="%" error={errors.taxRate} />
        <Input label={t('settings.menu.descriptionBn')} lang="bn" maxLength={160} value={form.descriptionBn} onChange={(event) => set('descriptionBn', event.target.value)} />
        <Input label={t('settings.menu.descriptionEn')} lang="en" maxLength={160} value={form.descriptionEn} onChange={(event) => set('descriptionEn', event.target.value)} />
        <NumberInput label={t('settings.menu.prepTime')} value={form.preparationTime} onValueChange={(value) => set('preparationTime', value)} decimals={0} />
        <div className="flex items-end">
          <Switch label={t('settings.menu.available')} checked={form.isAvailable} onCheckedChange={(checked) => set('isAvailable', checked)} className="w-full" />
        </div>

        <div className="flex items-center gap-4 md:col-span-2">
          <div className="grid size-24 shrink-0 place-items-center overflow-hidden rounded-card border border-border bg-surface-2">
            {form.image ? <img src={form.image} alt="" className="size-full object-cover" /> : <ImagePlus className="size-8 text-fg-subtle" aria-hidden />}
          </div>
          <div className="space-y-2">
            <p className="text-sm font-semibold">{t('settings.menu.image')}</p>
            <p className="text-sm text-fg-muted">{t('settings.menu.imageHint')}</p>
            <div className="flex gap-2">
              <Button variant="secondary" size="sm" icon={<ImagePlus className="size-4" aria-hidden />} onClick={() => fileInput.current?.click()}>
                {t('settings.menu.uploadImage')}
              </Button>
              {form.image && (
                <Button variant="danger-soft" size="sm" icon={<Trash className="size-4" aria-hidden />} onClick={() => set('image', undefined)}>
                  {t('settings.menu.removeImage')}
                </Button>
              )}
            </div>
            <input
              ref={fileInput}
              type="file"
              accept="image/png,image/jpeg,image/webp"
              className="hidden"
              onChange={(event) => {
                void pickImage(event.target.files?.[0]);
                event.target.value = '';
              }}
            />
          </div>
        </div>
        <button type="submit" hidden aria-hidden tabIndex={-1} />
      </form>
    </Modal>
  );
}
