import { useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { SearchInput } from '@/components/common/SearchInput';
import { KEYBOARD_SHORTCUTS } from '@/config/app.config';
import { useMenuStore } from '@/store/menuStore';
import { useUIStore } from '@/store/uiStore';

/** Instant menu search (Bangla, English or code). Focused by F4 / Ctrl+K. */
export function MenuSearch() {
  const { t } = useTranslation();
  const query = useMenuStore((state) => state.searchQuery);
  const setQuery = useMenuStore((state) => state.setSearchQuery);
  const focusToken = useUIStore((state) => state.searchFocusToken);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (focusToken === 0) return;
    inputRef.current?.focus();
    inputRef.current?.select();
  }, [focusToken]);

  return (
    <SearchInput
      ref={inputRef}
      value={query}
      onValueChange={setQuery}
      label={t('pos.searchLabel')}
      placeholder={t('pos.searchPlaceholder')}
      shortcutHint={KEYBOARD_SHORTCUTS.searchCombo.label}
      className="w-full"
    />
  );
}
