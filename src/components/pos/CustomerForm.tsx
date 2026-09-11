import { useTranslation } from 'react-i18next';
import { Input } from '@/components/common/Input';
import { usePosStore } from '@/store/posStore';
import type { Customer } from '@/types';

const EMPTY_CUSTOMER: Customer = { name: '', phone: '', address: '' };

/** Delivery: customer name, phone and address (printed on receipt and KOT). */
export function CustomerForm() {
  const { t } = useTranslation();
  const customer = usePosStore((state) => state.draft.customer) ?? EMPTY_CUSTOMER;
  const setCustomer = usePosStore((state) => state.setCustomer);

  const update = (field: keyof Customer, value: string) => setCustomer({ ...customer, [field]: value });

  return (
    <fieldset className="grid grid-cols-2 gap-2">
      <legend className="sr-only">{t('cart.customer')}</legend>
      <Input
        placeholder={t('cart.customerName')}
        aria-label={t('cart.customerName')}
        value={customer.name}
        onChange={(event) => update('name', event.target.value)}
        autoComplete="off"
        maxLength={80}
      />
      <Input
        placeholder={t('cart.customerPhone')}
        aria-label={t('cart.customerPhone')}
        value={customer.phone}
        onChange={(event) => update('phone', event.target.value)}
        inputMode="tel"
        autoComplete="off"
        maxLength={24}
      />
      <Input
        placeholder={t('cart.customerAddress')}
        aria-label={t('cart.customerAddress')}
        value={customer.address ?? ''}
        onChange={(event) => update('address', event.target.value)}
        autoComplete="off"
        maxLength={200}
        containerClassName="col-span-2"
      />
    </fieldset>
  );
}
