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
    <div className="flex h-full min-h-0">
      <nav aria-label={t('settings.title')} className="w-64 shrink-0 space-y-1 overflow-y-auto border-e border-border bg-surface p-3">
        <h1 className="px-3 pt-1 pb-3 text-2xl font-bold">{t('settings.title')}</h1>
        {SECTIONS.map(({ id, icon: Icon }) => (
          <button
            key={id}
            type="button"
            onClick={() => setActive(id)}
            aria-current={active === id ? 'page' : undefined}
            className={cn(
              'flex min-h-touch w-full items-center gap-3 rounded-control px-3 text-start font-semibold transition-colors',
              active === id ? 'bg-primary/15 text-primary-text' : 'text-fg-muted hover:bg-surface-2 hover:text-fg',
            )}
          >
            <Icon className="size-5 shrink-0" aria-hidden />
            {t(`settings.sections.${id}`)}
          </button>
        ))}
      </nav>
      <div className="min-w-0 flex-1 overflow-y-auto p-6">
        <div className="mx-auto max-w-5xl">
          <Section id={active} />
        </div>
      </div>
    </div>
  );
}
