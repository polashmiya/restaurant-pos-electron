import { TriangleAlert } from 'lucide-react';
import { Component, type ErrorInfo, type ReactNode } from 'react';
import { i18n } from '@/i18n';

interface ErrorBoundaryProps {
  children: ReactNode;
  /** Shown instead of the full-screen fallback (e.g. inside a page). */
  compact?: boolean;
}

interface ErrorBoundaryState {
  error: Error | null;
}

/**
 * Catches rendering errors so a broken screen never loses completed orders.
 * Shows a localized, non-technical message with a retry.
 */
export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  override state: ErrorBoundaryState = { error: null };

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { error };
  }

  override componentDidCatch(error: Error, info: ErrorInfo): void {
    console.error('[ui-error]', error, info.componentStack);
  }

  private readonly retry = () => this.setState({ error: null });

  override render() {
    if (!this.state.error) return this.props.children;
    const t = i18n.t.bind(i18n);
    return (
      <div
        role="alert"
        className={
          this.props.compact
            ? 'flex h-full flex-col items-center justify-center gap-4 p-8 text-center'
            : 'flex h-full flex-col items-center justify-center gap-5 bg-bg p-8 text-center text-fg'
        }
      >
        <span className="grid size-16 place-items-center rounded-full bg-danger/15 text-danger-text">
          <TriangleAlert className="size-8" aria-hidden />
        </span>
        <div className="max-w-md space-y-2">
          <h1 className="text-2xl font-bold">{t('app.errorBoundaryTitle')}</h1>
          <p className="text-fg-muted">{t('app.errorBoundaryMessage')}</p>
        </div>
        <div className="flex gap-3">
          <button
            type="button"
            onClick={this.retry}
            className="min-h-touch rounded-control bg-primary px-5 font-semibold text-primary-fg hover:bg-primary-hover"
          >
            {t('app.tryAgain')}
          </button>
          {!this.props.compact && (
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="min-h-touch rounded-control border border-border bg-surface-2 px-5 font-semibold hover:bg-surface-3"
            >
              {t('app.reload')}
            </button>
          )}
        </div>
      </div>
    );
  }
}
