import { afterEach } from 'vitest';
import { initI18n } from '@/i18n';

initI18n('bn');

afterEach(() => {
  window.localStorage.clear();
});
