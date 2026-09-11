import { useState, type FormEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/common/Button';
import { Input } from '@/components/common/Input';
import { Modal } from '@/components/common/Modal';
import { NumberInput } from '@/components/common/NumberInput';
import { CATEGORY_COLOR_KEYS, CATEGORY_ICON_KEYS, CATEGORY_ICONS, CATEGORY_TINTS } from '@/components/pos/categoryVisuals';
import { message } from '@/i18n/keys';
import { useMenuStore } from '@/store/menuStore';
import { toast } from '@/store/uiStore';
import type { Category, CategoryColor, CategoryIcon } from '@/types';
import { cn } from '@/utils/cn';
import { getErrorMessageKey } from '@/utils/errors';
import { createId } from '@/utils/id';

/** Add / edit a bilingual menu category with icon and color. */
export function CategoryFormModal({ category, onClose }: { category?: Category; onClose: () => void }) {
  const { t } = useTranslation();
  const categories = useMenuStore((state) => state.categories);
  const saveCategory = useMenuStore((state) => state.saveCategory);
  const [nameBn, setNameBn] = useState(category?.name.bn ?? '');
  const [nameEn, setNameEn] = useState(category?.name.en ?? '');
  const [icon, setIcon] = useState<CategoryIcon>(category?.icon ?? 'general');
  const [color, setColor] = useState<CategoryColor>(category?.color ?? 'blue');
  const [sortOrder, setSortOrder] = useState<number | null>(
    category?.sortOrder ?? categories.reduce((max, entry) => Math.max(max, entry.sortOrder), 0) + 1,
  );
  const [submitted, setSubmitted] = useState(false);
  const [saving, setSaving] = useState(false);

  const errors = {
    nameBn: !nameBn.trim() ? t('validation.required') : undefined,
    nameEn: !nameEn.trim() ? t('validation.required') : undefined,
  };

  const submit = async (event?: FormEvent) => {
    event?.preventDefault();
    setSubmitted(true);
    if (errors.nameBn || errors.nameEn) return;
    setSaving(true);
    try {
      await saveCategory({
        id: category?.id ?? createId('cat'),
        name: { bn: nameBn.trim(), en: nameEn.trim() },
        icon,
        color,
        sortOrder: sortOrder ?? 0,
      });
      toast.success(message('settings.menu.categorySaved'));
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
      title={category ? t('settings.menu.editCategory') : t('settings.menu.addCategory')}
      size="md"
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
      <form onSubmit={(event) => void submit(event)} className="space-y-4">
        <div className="grid gap-4 md:grid-cols-2">
          <Input label={t('settings.menu.nameBn')} lang="bn" required value={nameBn} onChange={(event) => setNameBn(event.target.value)} maxLength={40} error={submitted ? errors.nameBn : undefined} data-autofocus />
          <Input label={t('settings.menu.nameEn')} lang="en" required value={nameEn} onChange={(event) => setNameEn(event.target.value)} maxLength={40} error={submitted ? errors.nameEn : undefined} />
        </div>
        <div>
          <p className="mb-2 text-sm font-semibold">{t('settings.menu.icon')}</p>
          <div role="radiogroup" aria-label={t('settings.menu.icon')} className="grid grid-cols-6 gap-2">
            {CATEGORY_ICON_KEYS.map((key) => {
              const Icon = CATEGORY_ICONS[key];
              return (
                <button
                  key={key}
                  type="button"
                  role="radio"
                  aria-checked={icon === key}
                  aria-label={t(`settings.menu.icons.${key}`)}
                  title={t(`settings.menu.icons.${key}`)}
                  onClick={() => setIcon(key)}
                  className={cn(
                    'grid min-h-touch place-items-center rounded-control border-2',
                    icon === key ? 'border-primary bg-primary/15 text-primary-text' : 'border-border bg-surface-2 hover:bg-surface-3',
                  )}
                >
                  <Icon className="size-6" aria-hidden />
                </button>
              );
            })}
          </div>
        </div>
        <div>
          <p className="mb-2 text-sm font-semibold">{t('settings.menu.color')}</p>
          <div role="radiogroup" aria-label={t('settings.menu.color')} className="grid grid-cols-8 gap-2">
            {CATEGORY_COLOR_KEYS.map((key) => (
              <button
                key={key}
                type="button"
                role="radio"
                aria-checked={color === key}
                aria-label={t(`settings.menu.colors.${key}`)}
                title={t(`settings.menu.colors.${key}`)}
                onClick={() => setColor(key)}
                className={cn(
                  'grid min-h-touch place-items-center rounded-control border-2',
                  CATEGORY_TINTS[key].surface,
                  color === key ? 'border-fg' : 'border-transparent',
                )}
              >
                <span className={cn('size-5 rounded-full', CATEGORY_TINTS[key].strip)} aria-hidden />
              </button>
            ))}
          </div>
        </div>
        <NumberInput label={t('settings.menu.sortOrder')} value={sortOrder} onValueChange={setSortOrder} decimals={0} containerClassName="max-w-40" />
        <button type="submit" hidden aria-hidden tabIndex={-1} />
      </form>
    </Modal>
  );
}
