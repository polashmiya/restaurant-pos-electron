import { ChartColumn, Clock, LayoutGrid, ReceiptText, Settings, ShoppingCart, type LucideIcon } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Tooltip } from '@/components/common/Tooltip';
import { KEYBOARD_SHORTCUTS } from '@/config/app.config';
import { useUIStore, type PageId } from '@/store/uiStore';
import { cn } from '@/utils/cn';

interface NavItem {
  page: PageId;
  icon: LucideIcon;
  shortcut?: string;
}

const MAIN_ITEMS: NavItem[] = [
  { page: 'pos', icon: ShoppingCart, shortcut: KEYBOARD_SHORTCUTS.goPos.label },
  { page: 'tables', icon: LayoutGrid, shortcut: KEYBOARD_SHORTCUTS.goTables.label },
  { page: 'orders', icon: ReceiptText, shortcut: KEYBOARD_SHORTCUTS.goOrders.label },
  { page: 'reports', icon: ChartColumn, shortcut: KEYBOARD_SHORTCUTS.goReports.label },
  { page: 'shift', icon: Clock },
];

const SETTINGS_ITEM: NavItem = { page: 'settings', icon: Settings };

function NavButton({ item }: { item: NavItem }) {
  const { t } = useTranslation();
  const active = useUIStore((state) => state.activePage === item.page);
  const navigate = useUIStore((state) => state.navigate);
  const Icon = item.icon;
  const label = t(`nav.${item.page}`);

  return (
    // The tooltip only helps the side rail; in the bottom bar the label is
    // already under the icon and the bubble would cover the next tab.
    <Tooltip
      label={label}
      shortcut={item.shortcut}
      side="end"
      className="flex-1 md:w-full md:flex-none"
      bubbleClassName="max-md:hidden"
    >
      <button
        type="button"
        onClick={() => navigate(item.page)}
        aria-current={active ? 'page' : undefined}
        className={cn(
          'relative flex w-full flex-col items-center justify-center gap-0.5 rounded-control px-1',
          'min-h-14 text-[0.6875rem] font-semibold transition-colors duration-150',
          'md:min-h-[4.5rem] md:gap-1 md:text-xs',
          active ? 'bg-primary/15 text-primary-text' : 'text-fg-muted hover:bg-surface-2 hover:text-fg',
        )}
      >
        {active && (
          <span
            aria-hidden
            className="absolute inset-x-3 top-0 h-1 rounded-b-full bg-primary md:inset-x-auto md:inset-y-3 md:start-0 md:h-auto md:w-1 md:rounded-e-full md:rounded-b-none"
          />
        )}
        <Icon className="size-5 md:size-6" aria-hidden />
        <span className="line-clamp-1 text-center">{label}</span>
      </button>
    </Tooltip>
  );
}

/**
 * One navigation that changes shape: a bottom bar with evenly split tabs on
 * phones and small windows, the side rail from `md` up.
 */
export function Sidebar() {
  const { t } = useTranslation();
  return (
    <nav
      aria-label={t('nav.mainNavigation')}
      className={cn(
        'flex shrink-0 items-stretch gap-0.5 border-t border-border bg-surface px-1 pt-0.5 pb-[max(0.125rem,env(safe-area-inset-bottom))] no-print',
        'md:w-sidebar md:flex-col md:gap-1 md:border-t-0 md:border-e md:p-2',
      )}
    >
      {MAIN_ITEMS.map((item) => (
        <NavButton key={item.page} item={item} />
      ))}
      <div className="hidden flex-1 md:block" />
      <NavButton item={SETTINGS_ITEM} />
    </nav>
  );
}
