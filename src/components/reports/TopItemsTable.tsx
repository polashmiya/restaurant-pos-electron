import { UtensilsCrossed } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { ItemImage } from '@/components/common/ItemImage';
import type { Formatters } from '@/hooks/useFormatters';
import type { ItemRow } from '@/types';

/** Best sellers with their photo, quantity, sales and share of all items sold. */
export function TopItemsTable({ items, itemsSold, format }: { items: readonly ItemRow[]; itemsSold: number; format: Formatters }) {
  const { t } = useTranslation();
  const topQuantity = items.reduce((highest, item) => Math.max(highest, item.quantity), 0);

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="text-xs text-fg-muted">
            <th scope="col" className="w-10 pb-2 text-start font-semibold">
              {t('reports.columns.rank')}
            </th>
            <th scope="col" className="pb-2 text-start font-semibold">
              {t('reports.columns.item')}
            </th>
            <th scope="col" className="pb-2 text-end font-semibold">
              {t('reports.columns.quantity')}
            </th>
            <th scope="col" className="pb-2 text-end font-semibold">
              {t('reports.columns.sales')}
            </th>
            <th scope="col" className="w-36 ps-4 pb-2 text-end font-semibold">
              {t('reports.columns.share')}
            </th>
          </tr>
        </thead>
        <tbody>
          {items.map((item, index) => {
            const share = itemsSold > 0 ? item.quantity / itemsSold : 0;
            return (
              <tr key={item.menuItemId} className="border-t border-border">
                <td className="py-2 font-semibold text-fg-muted tabular-nums">{format.number(index + 1)}</td>
                <td className="py-2">
                  <div className="flex min-w-0 items-center gap-3">
                    <span className="grid h-10 w-16 shrink-0 place-items-center overflow-hidden rounded-lg bg-surface-3">
                      <ItemImage
                        src={item.image}
                        className="size-full object-cover"
                        fallback={<UtensilsCrossed className="size-4 text-fg-subtle" aria-hidden />}
                      />
                    </span>
                    <span className="min-w-0">
                      <span className="block truncate font-semibold text-fg">{format.text(item.name)}</span>
                      {item.code && <span className="block text-xs text-fg-muted">{item.code}</span>}
                    </span>
                  </div>
                </td>
                <td className="py-2 text-end font-semibold tabular-nums">{format.number(item.quantity)}</td>
                <td className="py-2 text-end whitespace-nowrap tabular-nums">{format.currency(item.sales)}</td>
                <td className="py-2 ps-4">
                  <div className="flex items-center justify-end gap-2">
                    <div className="h-2 w-16 rounded-e-[4px] bg-chart-1/12" aria-hidden>
                      <div
                        className="h-full rounded-e-[4px] bg-chart-1"
                        style={{ width: `${topQuantity > 0 ? (item.quantity / topQuantity) * 100 : 0}%` }}
                      />
                    </div>
                    <span className="w-12 text-end text-xs text-fg-muted tabular-nums">
                      {format.percent(Math.round(share * 1000) / 10)}
                    </span>
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
