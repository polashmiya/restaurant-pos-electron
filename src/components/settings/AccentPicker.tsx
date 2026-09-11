import { Check } from 'lucide-react';
import type { KeyboardEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { ACCENT_COLORS } from '@/config/app.config';
import type { AccentColor } from '@/types';
import { cn } from '@/utils/cn';

/** Static class names so Tailwind generates each swatch color. */
const SWATCH_CLASSES: Record<AccentColor, string> = {
  blue: 'bg-swatch-blue',
  green: 'bg-swatch-green',
  violet: 'bg-swatch-violet',
  orange: 'bg-swatch-orange',
  teal: 'bg-swatch-teal',
};

/** Accent color choice: a row of color swatches (a radio group; arrow keys move). */
export function AccentPicker({ value, onValueChange }: { value: AccentColor; onValueChange: (color: AccentColor) => void }) {
  const { t } = useTranslation();

  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    const forward = event.key === 'ArrowRight' || event.key === 'ArrowDown';
    const backward = event.key === 'ArrowLeft' || event.key === 'ArrowUp';
    if (!forward && !backward) return;
    event.preventDefault();
    const index = ACCENT_COLORS.indexOf(value);
    const nextIndex = (index + (forward ? 1 : -1) + ACCENT_COLORS.length) % ACCENT_COLORS.length;
    onValueChange(ACCENT_COLORS[nextIndex]!);
    event.currentTarget.querySelectorAll<HTMLButtonElement>('[role="radio"]')[nextIndex]?.focus();
  };

  return (
    <div role="radiogroup" aria-label={t('accentColor.label')} className="flex flex-wrap gap-2" onKeyDown={handleKeyDown}>
      {ACCENT_COLORS.map((color) => {
        const selected = color === value;
        return (
          <button
            key={color}
            type="button"
            role="radio"
            aria-checked={selected}
            tabIndex={selected ? 0 : -1}
            onClick={() => onValueChange(color)}
            className={cn(
              'group flex min-h-touch w-16 flex-col items-center gap-1.5 rounded-control py-1 text-xs font-semibold transition-colors',
              selected ? 'text-fg' : 'text-fg-muted hover:text-fg',
            )}
          >
            <span
              aria-hidden
              className={cn(
                'grid size-10 place-items-center rounded-full ring-offset-2 ring-offset-surface transition-shadow',
                SWATCH_CLASSES[color],
                selected ? 'ring-2 ring-fg' : 'group-hover:ring-2 group-hover:ring-border-strong',
              )}
            >
              {selected && <Check className="size-5 text-white" strokeWidth={3} />}
            </span>
            {t(`accentColor.${color}`)}
          </button>
        );
      })}
    </div>
  );
}
