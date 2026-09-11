import { Ban, CircleCheck, Pause, PencilLine } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Badge, type BadgeTone } from '@/components/common/Badge';
import type { OrderStatus } from '@/types';

const STATUS_VISUALS: Record<OrderStatus, { tone: BadgeTone; icon: typeof Ban }> = {
  draft: { tone: 'info', icon: PencilLine },
  held: { tone: 'warning', icon: Pause },
  completed: { tone: 'success', icon: CircleCheck },
  cancelled: { tone: 'danger', icon: Ban },
};

export function OrderStatusBadge({ status, size = 'sm' }: { status: OrderStatus; size?: 'sm' | 'md' }) {
  const { t } = useTranslation();
  const { tone, icon: Icon } = STATUS_VISUALS[status];
  return (
    <Badge tone={tone} size={size} icon={<Icon className="size-3.5" aria-hidden />}>
      {t(`orderStatus.${status}`)}
    </Badge>
  );
}
