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
    <Tooltip label={label} shortcut={item.shortcut} side="end" className="w-full">
      <button
        type="button"
        onClick={() => navigate(item.page)}
        aria-current={active ? 'page' : undefined}
        className={cn(
          'relative flex min-h-[4.5rem] w-full flex-col items-center justify-center gap-1 rounded-control px-1',
          'text-xs font-semibold transition-colors duration-150',
          active ? 'bg-primary/15 text-primary-text' : 'text-fg-muted hover:bg-surface-2 hover:text-fg',
        )}
      >
        {active && <span aria-hidden className="absolute inset-y-3 start-0 w-1 rounded-e-full bg-primary" />}
        <Icon className="size-6" aria-hidden />
        <span className="line-clamp-1 text-center">{label}</span>
      </button>
    </Tooltip>
  );
}

export function Sidebar() {
  const { t } = useTranslation();
  return (
    <nav
      aria-label={t('nav.mainNavigation')}
      className="flex w-sidebar shrink-0 flex-col gap-1 border-e border-border bg-surface p-2 no-print"
    >
      {MAIN_ITEMS.map((item) => (
        <NavButton key={item.page} item={item} />
      ))}
      <div className="flex-1" />
      <NavButton item={SETTINGS_ITEM} />
    </nav>
  );
}
