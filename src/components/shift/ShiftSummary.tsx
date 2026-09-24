import { Banknote, BadgePercent, Calculator, CreditCard, Landmark, ReceiptText, Smartphone, TrendingUp, Wallet } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useFormatters } from '@/hooks/useFormatters';
import type { Shift } from '@/types';
import { calculateAverageOrder, calculateExpectedCash } from '@/utils/shiftMath';
import { StatCard } from './StatCard';

/** Totals of a shift (master spec §40, §98). */
export function ShiftSummary({ shift }: { shift: Shift }) {
  const { t } = useTranslation();
  const format = useFormatters();

  const breakdown = [
    { key: 'cash', label: t('shift.cashSales'), value: shift.cashSales, icon: Banknote, bar: 'bg-success' },
    { key: 'card', label: t('shift.cardSales'), value: shift.cardSales, icon: CreditCard, bar: 'bg-primary' },
    { key: 'mobile', label: t('shift.mobileSales'), value: shift.mobileSales, icon: Smartphone, bar: 'bg-info' },
  ];
  const total = shift.totalSales || 1;

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4">
        <StatCard emphasis label={t('shift.totalRevenue')} value={format.currency(shift.totalSales)} icon={<TrendingUp />} tone="success" />
        <StatCard label={t('shift.orderCount')} value={format.number(shift.orderCount)} icon={<ReceiptText />} />
        <StatCard label={t('shift.averageOrder')} value={format.currency(calculateAverageOrder(shift))} icon={<Calculator />} />
        <StatCard label={t('shift.expectedCash')} value={format.currency(calculateExpectedCash(shift))} icon={<Wallet />} tone="warning" />
      </div>

      <div className="grid gap-3 sm:gap-4 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
        <section aria-label={t('shift.paymentBreakdown')} className="rounded-card border border-border bg-surface p-4 sm:p-5">
          <h3 className="mb-4 text-lg font-bold">{t('shift.paymentBreakdown')}</h3>
          <ul className="space-y-4">
            {breakdown.map(({ key, label, value, icon: Icon, bar }) => {
              const percent = Math.round((value / total) * 100);
              return (
                <li key={key} className="space-y-1.5">
                  <div className="flex items-center justify-between gap-3">
                    <span className="flex items-center gap-2 font-semibold">
                      <Icon className="size-5 text-fg-muted" aria-hidden />
                      {label}
                    </span>
                    <span className="font-bold tabular-nums">
                      {format.currency(value)}
                      <span className="ms-2 text-sm font-medium text-fg-muted">{format.percent(shift.totalSales ? percent : 0)}</span>
                    </span>
                  </div>
                  <div
                    className="h-3 overflow-hidden rounded-full bg-surface-3"
                    role="meter"
                    aria-label={label}
                    aria-valuemin={0}
                    aria-valuemax={100}
                    aria-valuenow={shift.totalSales ? percent : 0}
                  >
                    <div className={`h-full rounded-full ${bar}`} style={{ width: `${shift.totalSales ? percent : 0}%` }} />
                  </div>
                </li>
              );
            })}
          </ul>
        </section>

        <div className="grid gap-3 sm:gap-4">
          <StatCard label={t('shift.taxCollected')} value={format.currency(shift.taxCollected)} icon={<Landmark />} />
          <StatCard label={t('shift.discountGiven')} value={format.currency(shift.discountTotal)} icon={<BadgePercent />} />
          <StatCard label={t('shift.openingCash')} value={format.currency(shift.openingCash)} icon={<Banknote />} />
        </div>
      </div>
    </div>
  );
}
