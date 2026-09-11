import { Bike, ShoppingBag, Utensils } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { SegmentedControl } from '@/components/common/SegmentedControl';
import { requestOrderTypeChange } from '@/services/posActions';
import { usePosStore } from '@/store/posStore';
import type { OrderType } from '@/types';

const ORDER_TYPE_ICONS = { 'dine-in': Utensils, takeaway: ShoppingBag, delivery: Bike } as const;
const ORDER_TYPES: OrderType[] = ['dine-in', 'takeaway', 'delivery'];

export function OrderTypeSelector() {
  const { t } = useTranslation();
  const orderType = usePosStore((state) => state.draft.orderType);
  return (
    <SegmentedControl<OrderType>
      label={t('orderType.label')}
      value={orderType}
      onValueChange={(next) => void requestOrderTypeChange(next)}
      fullWidth
      options={ORDER_TYPES.map((type) => {
        const Icon = ORDER_TYPE_ICONS[type];
        return { value: type, label: t(`orderType.${type}`), icon: <Icon className="size-4" aria-hidden /> };
      })}
    />
  );
}
