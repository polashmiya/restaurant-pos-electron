import { Search, X } from 'lucide-react';
import type { InputHTMLAttributes, Ref } from 'react';
import { useTranslation } from 'react-i18next';
import { cn } from '@/utils/cn';
import { controlClassName } from './styles';
import { Kbd } from './Kbd';

export interface SearchInputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'value' | 'onChange' | 'type'> {
  value: string;
  onValueChange: (value: string) => void;
  /** Accessible label (also used as the placeholder fallback). */
  label: string;
  shortcutHint?: string;
  ref?: Ref<HTMLInputElement>;
}

export function SearchInput({
  value,
  onValueChange,
  label,
  shortcutHint,
  placeholder,
  className,
  ref,
  onKeyDown,
  ...rest
}: SearchInputProps) {
  const { t } = useTranslation();
  return (
    <div className={cn('relative flex items-center', className)}>
      <Search className="pointer-events-none absolute start-3.5 size-5 text-fg-subtle" aria-hidden />
      <input
        ref={ref}
        type="search"
        role="searchbox"
        aria-label={label}
        value={value}
        placeholder={placeholder ?? label}
        onChange={(event) => onValueChange(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === 'Escape' && value) {
            event.preventDefault();
            event.stopPropagation();
            onValueChange('');
          }
          onKeyDown?.(event);
        }}
        className={cn(
          controlClassName,
          'min-h-touch ps-11 [&::-webkit-search-cancel-button]:hidden',
          value ? 'pe-12' : shortcutHint ? 'pe-24' : 'pe-4',
        )}
        {...rest}
      />
      <div className="absolute end-2 flex items-center gap-1">
        {value ? (
          <button
            type="button"
            onClick={() => onValueChange('')}
            aria-label={t('common.clearSearch')}
            className="grid size-9 place-items-center rounded-lg text-fg-muted hover:bg-surface-3 hover:text-fg"
          >
            <X className="size-4" aria-hidden />
          </button>
        ) : (
          shortcutHint && <Kbd className="me-1">{shortcutHint}</Kbd>
        )}
      </div>
    </div>
  );
}
