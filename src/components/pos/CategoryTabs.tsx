import { LayoutGrid } from 'lucide-react';
import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { useFormatters } from '@/hooks/useFormatters';
import { ALL_CATEGORIES, useMenuStore, useSortedCategories } from '@/store/menuStore';
import { cn } from '@/utils/cn';
import { CATEGORY_ICONS, FALLBACK_CATEGORY_ICON } from './categoryVisuals';

function TabButton({
  selected,
  onSelect,
  icon,
  label,
}: {
  selected: boolean;
  onSelect: () => void;
  icon: ReactNode;
  label: string;
}) {
  return (
    <button
      type="button"
      aria-pressed={selected}
      onClick={onSelect}
      className={cn(
        'inline-flex min-h-touch shrink-0 items-center gap-2 rounded-full border px-4 text-sm font-semibold whitespace-nowrap',
        'transition-colors duration-150 compact:min-h-10 compact:px-3',
        selected
          ? 'border-primary bg-primary text-primary-fg shadow-sm'
          : 'border-border bg-surface text-fg-muted hover:border-border-strong hover:text-fg',
      )}
    >
      {icon}
      {label}
    </button>
  );
}

/** Horizontally scrolling category filter ("All" + configured categories). */
export function CategoryTabs() {
  const { t } = useTranslation();
  const format = useFormatters();
  const categories = useSortedCategories();
  const selected = useMenuStore((state) => state.selectedCategoryId);
  const selectCategory = useMenuStore((state) => state.selectCategory);

  return (
    <div role="group" aria-label={t('pos.categories')} className="scrollbar-none flex gap-2 overflow-x-auto pb-1">
      <TabButton
        selected={selected === ALL_CATEGORIES}
        onSelect={() => selectCategory(ALL_CATEGORIES)}
        icon={<LayoutGrid className="size-4" aria-hidden />}
        label={t('pos.allCategories')}
      />
      {categories.map((category) => {
        const Icon = CATEGORY_ICONS[category.icon] ?? FALLBACK_CATEGORY_ICON;
        return (
          <TabButton
            key={category.id}
            selected={selected === category.id}
            onSelect={() => selectCategory(category.id)}
            icon={<Icon className="size-4" aria-hidden />}
            label={format.text(category.name)}
          />
        );
      })}
    </div>
  );
}
