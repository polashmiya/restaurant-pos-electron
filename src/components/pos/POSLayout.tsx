import { ShoppingCart, X } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { IconButton } from '@/components/common/IconButton';
import { useFormatters } from '@/hooks/useFormatters';
import { useCartTotals } from '@/store/posStore';
import { useUIStore } from '@/store/uiStore';
import { CartPanel } from './CartPanel';
import { CategoryTabs } from './CategoryTabs';
import { MenuGrid } from './MenuGrid';
import { MenuSearch } from './MenuSearch';

/**
 * Split-screen POS (≈65% menu / 35% cart). Below 1024 px the cart becomes a
 * slide-over drawer opened from a floating button, so the POS stays usable.
 */
export function POSLayout() {
  const { t } = useTranslation();
  const format = useFormatters();
  const totals = useCartTotals();
  const drawerOpen = useUIStore((state) => state.isCartDrawerOpen);
  const setDrawerOpen = useUIStore((state) => state.setCartDrawerOpen);

  return (
    <div className="flex h-full min-h-0">
      <section
        aria-label={t('pos.menu')}
        className="flex min-w-0 flex-1 flex-col gap-3 p-4 compact:gap-2 compact:p-3"
      >
        <MenuSearch />
        <CategoryTabs />
        <MenuGrid />
      </section>

      <aside className="hidden w-[clamp(22rem,35%,32rem)] shrink-0 border-s border-border lg:flex">
        <CartPanel />
      </aside>

      {/* Narrow windows: floating cart button + drawer. */}
      <button
        type="button"
        onClick={() => setDrawerOpen(true)}
        className="fixed end-4 bottom-4 z-30 flex min-h-14 items-center gap-3 rounded-full bg-primary px-5 font-bold text-primary-fg shadow-xl lg:hidden"
        aria-label={t('pos.showCart')}
      >
        <ShoppingCart className="size-5" aria-hidden />
        <span className="tabular-nums">{format.number(totals.itemCount)}</span>
        <span className="tabular-nums">{format.currency(totals.total)}</span>
      </button>

      {drawerOpen && (
        <div className="fixed inset-0 z-30 flex justify-end lg:hidden">
          <div aria-hidden className="absolute inset-0 bg-overlay" onClick={() => setDrawerOpen(false)} />
          <div className="relative flex h-full w-[min(30rem,100vw)] flex-col bg-surface shadow-2xl">
            <div className="flex justify-end border-b border-border p-2">
              <IconButton
                label={t('pos.hideCart')}
                icon={<X className="size-5" aria-hidden />}
                onClick={() => setDrawerOpen(false)}
              />
            </div>
            <div className="min-h-0 flex-1">
              <CartPanel />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
