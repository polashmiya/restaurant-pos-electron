import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import { ErrorBoundary } from './components/common/ErrorBoundary';
import { initI18n } from './i18n';
import { applyRememberedLook } from './utils/theme';
import './styles/index.css';

// i18n starts in the default language (Bangla); the saved preference is
// applied as soon as settings are loaded from local storage.
initI18n();

// Paint the loading screen in the last session's theme, accent and size.
applyRememberedLook();

const container = document.getElementById('root');
if (!container) {
  throw new Error('Root element #root was not found in index.html');
}

createRoot(container).render(
  <StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </StrictMode>,
);
