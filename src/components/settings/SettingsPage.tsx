import { Database, Info, LayoutGrid, Palette, Percent, Printer, Store, UtensilsCrossed, type LucideIcon } from 'lucide-react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { cn } from '@/utils/cn';
import { AboutSettings } from './AboutSettings';
import { AppearanceSettings } from './AppearanceSettings';
import { DataSettings } from './DataSettings';
import { MenuManagement } from './MenuManagement';
import { PrinterSettings } from './PrinterSettings';
import { RestaurantSettings } from './RestaurantSettings';
import { TableManagement } from './TableManagement';
import { TaxCurrencySettings } from './TaxCurrencySettings';

type SectionId = 'restaurant' | 'taxCurrency' | 'appearance' | 'printer' | 'menu' | 'tables' | 'data' | 'about';

const SECTIONS: { id: SectionId; icon: LucideIcon }[] = [
  { id: 'restaurant', icon: Store },
  { id: 'taxCurrency', icon: Percent },
  { id: 'appearance', icon: Palette },
  { id: 'printer', icon: Printer },
  { id: 'menu', icon: UtensilsCrossed },
  { id: 'tables', icon: LayoutGrid },
  { id: 'data', icon: Database },
  { id: 'about', icon: Info },
];

function Section({ id }: { id: SectionId }) {
  switch (id) {
    case 'restaurant':
      return <RestaurantSettings />;
    case 'taxCurrency':
      return <TaxCurrencySettings />;
    case 'appearance':
      return <AppearanceSettings />;
    case 'printer':
      return <PrinterSettings />;
    case 'menu':
      return <MenuManagement />;
    case 'tables':
      return <TableManagement />;
    case 'data':
      return <DataSettings />;
    case 'about':
      return <AboutSettings />;
  }
}

/** Settings: every change is saved locally and applied immediately. */
export function SettingsPage() {
  const { t } = useTranslation();
  const [active, setActive] = useState<SectionId>('restaurant');

  return (
    // The section list is a sideways-scrolling tab bar on phones and small
    // tablets, and the usual column from `lg` up.
    <div className="flex h-full min-h-0 flex-col lg:flex-row">
      <nav
        aria-label={t('settings.title')}
        className={cn(
          'scrollbar-none flex shrink-0 gap-1 overflow-x-auto border-b border-border bg-surface p-2',
          'lg:w-64 lg:flex-col lg:overflow-y-auto lg:border-e lg:border-b-0 lg:p-3',
        )}
      >
        <h1 className="sr-only lg:not-sr-only lg:px-3 lg:pt-1 lg:pb-3 lg:text-2xl lg:font-bold">{t('settings.title')}</h1>
        {SECTIONS.map(({ id, icon: Icon }) => (
          <button
            key={id}
            type="button"
            onClick={() => setActive(id)}
            aria-current={active === id ? 'page' : undefined}
            className={cn(
              'flex min-h-touch shrink-0 items-center gap-2 rounded-control px-3 text-start text-sm font-semibold whitespace-nowrap transition-colors',
              'lg:w-full lg:gap-3 lg:text-base',
              active === id ? 'bg-primary/15 text-primary-text' : 'text-fg-muted hover:bg-surface-2 hover:text-fg',
            )}
          >
            <Icon className="size-5 shrink-0" aria-hidden />
            {t(`settings.sections.${id}`)}
          </button>
        ))}
      </nav>
      <div className="min-w-0 flex-1 overflow-y-auto p-4 sm:p-6">
        <div className="mx-auto max-w-5xl">
          <Section id={active} />
        </div>
      </div>
    </div>
  );
}
